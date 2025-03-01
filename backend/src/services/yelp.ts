import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { cafes } from '@config/schemas.js';
import axios from 'axios';

const YELP_API_KEY = process.env.YELP_API_KEY as string;
const GOOGLE_API_KEY = process.env.GOOGLE_CLOUD_API as string;
const GOOGLE_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID as string;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const BASE_URL = 'https://api.yelp.com/v3/businesses/search';

/**
 * Search for photos using Google Custom Search API
 */
async function searchGooglePhotos(query: string): Promise<string[]> {
  const url = `https://www.googleapis.com/customsearch/v1`;
  const params = {
    q: query,
    key: GOOGLE_API_KEY,
    cx: GOOGLE_ENGINE_ID,
    searchType: 'image',
    num: 6 // Number of images to retrieve
  };

  try {
    const response = await axios.get(url, { params });
    return response.data.items.map((item: any) => item.link); // Extract image URLs
  } catch (error) {
    console.error('Error searching Google photos:', error);
    return []; // Return an empty array if there's an error
  }
}

/**
 * Format business hours into a readable format
 */
function formatBusinessHours(hours: any[]): Record<string, string> {
  const formattedHours: Record<string, string> = {};

  hours.forEach(({ day, start, end }) => {
    const hourFormat = (time: string): string => {
      const hour = parseInt(time.substring(0, 2), 10);
      const minute = time.substring(2);
      const period = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
      return `${formattedHour}:${minute} ${period}`;
    };

    const dayName = WEEKDAYS[day];
    const openTime = hourFormat(start);
    const closeTime = hourFormat(end);
    formattedHours[dayName] = `${openTime} - ${closeTime}`;
  });

  return formattedHours;
}

/**
 * Fetch Cafes from Yelp API
 */
export async function fetchCafes(
  req: FastifyRequest<{ Querystring: { location: string; limit?: number } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { location, limit = 20 } = req.query;

    // Fetch cafes from Yelp API
    const response = await axios.get(BASE_URL, {
      headers: { Authorization: `Bearer ${YELP_API_KEY}` },
      params: {
        term: 'cafe',
        location,
        limit
      }
    });

    // Fetch details (including hours) and photos for each cafe
    const cafesData = await Promise.all(
      response.data.businesses.map(async (cafe: any) => {
        console.log(cafe);
        try {
          // Fetch details for the cafe
          const detailsResponse = await axios.get(`https://api.yelp.com/v3/businesses/${cafe.id}`, {
            headers: { Authorization: `Bearer ${YELP_API_KEY}` }
          });

          // Extract and format hours
          const hours = detailsResponse.data.hours?.[0]?.open || [];
          const isOpenNow = detailsResponse.data.is_open_now ? 'open' : 'closed';
          const formattedHours = formatBusinessHours(hours);

          // Search for additional photos using Google Custom Search API

          const googlePhotos = await searchGooglePhotos(
            `${cafe.name} ${cafe.location.city} photos`
          );

          // Combine Yelp profile photo with Google photos
          const photos = cafe.image_url ? [cafe.image_url, ...googlePhotos] : googlePhotos;

          return {
            name: cafe.name,
            description: cafe.description || null,
            address: cafe.location.display_address.join(', '),
            city: cafe.location.city || null,
            state: cafe.location.state || null,
            zipCode: cafe.location.zip_code || null,
            ambiance: {},
            dietaryOptions: {},
            location: {
              type: 'Point',
              coordinates: [cafe.coordinates.longitude, cafe.coordinates.latitude]
            },
            keywords: cafe.categories.map((category: any) => category.title),
            photos, // Combine Yelp and Google photos
            hours: formattedHours, // Store hours in readable format
            rating: cafe.rating,
            status: isOpenNow,
            numOfRatings: cafe.review_count || 0,
            phone: detailsResponse.data.phone || cafe.phone || null
          };
        } catch (error) {
          console.error(`Error fetching details for cafe ${cafe.id}:`, {
            message: (error as Error).message,
            ...(axios.isAxiosError(error) && {
              status: error.response?.status,
              data: error.response?.data
            })
          });
          return null; // Skip this cafe if there's an error
        }
      })
    );

    // Filter out null values (cafes with errors)
    const validCafesData = cafesData.filter((cafe) => cafe !== null);

    // Insert cafes into the database
    for (const cafe of validCafesData) {
      await db
        .insert(cafes)
        .values({
          name: cafe.name,
          description: cafe.description,
          address: cafe.address,
          city: cafe.city,
          state: cafe.state,
          zipCode: cafe.zipCode,
          ambiance: cafe.ambiance,
          dietaryOptions: cafe.dietaryOptions,
          location: cafe.location,
          keywords: cafe.keywords,
          photos: cafe.photos,
          hours: cafe.hours,
          rating: cafe.rating, // Insert avgRating
          status: cafe.status, // Insert status (open/closed)
          numOfRatings: cafe.numOfRatings, // Insert number of ratings
          phone: cafe.phone
        })
        .onConflictDoUpdate({
          target: cafes.address,
          set: {
            name: cafe.name,
            description: cafe.description,
            address: cafe.address,
            city: cafe.city,
            state: cafe.state,
            zipCode: cafe.zipCode,
            location: cafe.location,
            keywords: cafe.keywords,
            photos: cafe.photos,
            hours: cafe.hours,
            rating: cafe.rating, // Insert avgRating
            status: cafe.status, // Insert status (open/closed)
            numOfRatings: cafe.numOfRatings, // Insert number of ratings
            phone: cafe.phone
          }
        });
    }

    reply.status(200).send({
      status: 'success',
      message: 'Cafes fetched and stored successfully',
      data: validCafesData
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching or storing cafes:', {
      message: err.message,
      stack: err.stack,
      ...(axios.isAxiosError(error) && { response: error.response?.data })
    });

    reply.status(500).send({
      status: 'error',
      message: 'Failed to fetch or store cafes',
      error: err.message
    });
  }
}
