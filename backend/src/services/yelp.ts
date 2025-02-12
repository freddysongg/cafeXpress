import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { cafes } from '@config/schemas.js';
import axios from 'axios';

const API_KEY = process.env.YELP_API_KEY as string;
const BASE_URL = 'https://api.yelp.com/v3/businesses/search';

if (!API_KEY) {
  throw new Error('YELP_API_KEY is not set in the environment.');
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

    // Map the response data to a cleaner format
    const cafesData = response.data.businesses.map((cafe: any) => ({
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
      photos: cafe.image_url ? [cafe.image_url] : []
    }));

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
          photos: cafe.photos // Store the profile photo
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
            photos: cafe.photos // Update the profile photo
          }
        });
    }

    // Send success response
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

    // Send error response
    reply.status(500).send({
      status: 'error',
      message: 'Failed to fetch or store cafes',
      error: err.message
    });
  }
}