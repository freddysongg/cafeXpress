import { FastifyRequest } from 'fastify';
import { db } from '@config/db.js';
import { cafes, preferences, reviews, users } from '@config/schemas.js';
import { eq, sql, desc } from 'drizzle-orm';

/**
 * Prepare context and fetch recommendations using Gemini API.
 */
export async function getRecommendationsWithGemini(
  req: FastifyRequest<{ Params: { userId: string } }>,
  geminiClient: any
) {
  try {
    const userId = req.params.userId;

    // Fetch user details
    const user = await db
      .select({
        username: users.username,
        email: users.email,
        description: users.description
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return {
        status: 'error',
        message: 'User not found.'
      };
    }

    // Fetch user preferences
    const userPreferences = await db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .limit(1);

    if (!userPreferences.length) {
      return {
        status: 'error',
        message: 'User preferences not found.'
      };
    }

    const { favoriteCafes, dietaryRestrictions, ambiance } = userPreferences[0];

    // Fetch top cafes and reviews
    const cafesData = await db
      .select({
        cafeId: cafes.id,
        name: cafes.name,
        address: cafes.address,
        city: cafes.city,
        state: cafes.state,
        averageRating: sql`AVG(${reviews.rating})`.as('average_rating')
      })
      .from(cafes)
      .leftJoin(reviews, eq(reviews.cafeId, cafes.id))
      .where(favoriteCafes ? sql`${cafes.id} = ANY(${favoriteCafes})` : sql`TRUE`)
      .groupBy(cafes.id)
      .orderBy(desc(sql`AVG(${reviews.rating})`))
      .limit(10);

    // Structure context for Gemini API
    const geminiContext = {
      user: {
        username: user[0].username,
        email: user[0].email,
        description: user[0].description
      },
      preferences: {
        dietaryRestrictions,
        ambiance
      },
      cafes: cafesData.map((cafe) => ({
        id: cafe.cafeId,
        name: cafe.name,
        address: cafe.address,
        city: cafe.city,
        state: cafe.state,
        averageRating: cafe.averageRating
      }))
    };

    // Send context to Gemini API
    const geminiResponse = await geminiClient.generateRecommendations(geminiContext);

    return {
      status: 'success',
      data: geminiResponse
    };
  } catch (error) {
    const err = error as Error;
    console.error('Error generating recommendations:', err.message);
    return {
      status: 'error',
      message: err.message
    };
  }
}
