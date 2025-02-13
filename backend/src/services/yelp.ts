import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { cafes } from '@config/schemas.js';
import axios from 'axios';

const API_KEY = process.env.YELP_API_KEY as string;
const BASE_URL = 'https://api.yelp.com/v3/businesses/search';

if (!API_KEY) {
  throw new Error('YELP_API_KEY is not set in the environment.');
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
      headers: { Authorization: `Bearer ${API_KEY}` },
      params: {
        term: 'cafe',
        location,
        limit
      }
    });

    // Fetch details (including hours) for each cafe
    const cafesData = await Promise.all(
      response.data.businesses.map(async (cafe: any) => {
        try {
          // Fetch details for the cafe
          const detailsResponse = await axios.get(`https://api.yelp.com/v3/businesses/${cafe.id}`, {
            headers: { Authorization: `Bearer ${API_KEY}` }
          });

          // Extract and format hours
          const hours = detailsResponse.data.hours?.[0]?.open || [];
          const formattedHours = formatBusinessHours(hours);

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
            photos: cafe.image_url ? [cafe.image_url] : [], // Store profile photo as an array
            hours: formattedHours // Store hours in readable format
          };
        } catch (error) {
          console.error(`Error fetching details for cafe ${cafe.id}:`, {
            message: (error as Error).message,
            ...(axios.isAxiosError(error) && {
              status: error.response?.status,
              data: error.response?.data
            })
          });
        }
      })
    );

    // Insert cafes into the database
    for (const cafe of cafesData) {
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
          hours: cafe.hours
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
            hours: cafe.hours
          }
        });
    }

    reply.status(200).send({
      status: 'success',
      message: 'Cafes fetched and stored successfully',
      data: cafesData
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
