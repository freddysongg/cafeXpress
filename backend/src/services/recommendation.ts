import { db } from '@config/db.js';
import { cafes, preferences, reviews, users } from '@config/schemas.js';
import { eq, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { setTimeout } from 'timers/promises';
import type { GeminiClient } from '@schemas/gemini.js';
import { RecommendationCache } from '@services/cache.js';
import {
  RecommendationResponse,
  PersonalizedRecommendationRequest,
  UserWithLocation,
  Location
} from '@schemas/recommendation.js';

const CACHE_CONFIG = {
  ttl: 60 * 60 * 1000, // 1 hour
  maxSize: 1000,
  staleWhileRevalidate: 30 * 60 * 1000 // 30 minutes
};

const RATE_LIMIT = {
  requestsPerSecond: 5,
  maxRetries: 3,
  initialRetryDelay: 1000,
  backoffFactor: 2
};

const cache = new RecommendationCache(CACHE_CONFIG);
let lastRequestTime = 0;

/**
 * Fetches user data including location from the database
 * @param userId - The ID of the user to fetch
 * @returns Promise resolving to UserWithLocation object
 * @throws Error if user not found
 */
async function fetchUserData(userId: string): Promise<UserWithLocation> {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      description: users.description,
      location: sql<Location>`${users.location}`
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

/**
 * Fetches user preferences from the database
 * @param userId - The ID of the user to fetch preferences for
 * @returns Promise resolving to user preferences object
 * @throws Error if preferences not found
 */
async function fetchUserPreferences(userId: string) {
  const [prefs] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, userId))
    .limit(1);

  if (!prefs) {
    throw new Error('User preferences not found');
  }
  return prefs;
}

/**
 * Fetches cafe data with optional location-based sorting
 * @param favoriteCafes - Array of favorite cafe IDs or null
 * @param location - Optional location object for distance-based sorting
 * @returns Promise resolving to array of cafe data objects
 */
async function fetchCafesData(
  favoriteCafes: string[] | null,
  location?: { latitude: number; longitude: number }
) {
  const baseQuery = db
    .select({
      id: cafes.id,
      name: cafes.name,
      address: cafes.address,
      rating: sql`AVG(${reviews.rating})`.as('average_rating'),
      distance: location
        ? sql`
        ST_Distance(
          ST_SetSRID(ST_MakePoint((cafes.location->'coordinates'->>0)::float, (cafes.location->'coordinates'->>1)::float), 4326),
          ST_SetSRID(ST_MakePoint(${location.longitude}, ${location.latitude}), 4326)
        )
      `.as('distance')
        : sql`NULL`.as('distance')
    })
    .from(cafes)
    .leftJoin(reviews, eq(reviews.cafeId, cafes.id))
    .where(favoriteCafes ? sql`${cafes.id} = ANY(${favoriteCafes})` : sql`TRUE`)
    .groupBy(cafes.id);

  return await baseQuery
    .orderBy(location ? sql`distance` : desc(sql`AVG(${reviews.rating})`))
    .limit(10);
}

/**
 * Analyzes cafe sentiment using Gemini AI with caching
 * @param geminiClient - Gemini client instance
 * @param cafe - Cafe data object
 * @returns Promise resolving to cafe data enriched with sentiment analysis
 */
async function analyzeCafeSentiment(geminiClient: GeminiClient, cafe: any) {
  const sentimentCacheKey = `sentiment:${cafe.id}`;
  const cachedSentiment = await cache.get(sentimentCacheKey);

  if (cachedSentiment) {
    return { ...cafe, ...cachedSentiment };
  }

  const sentiment = await geminiClient.analyzeText(`${cafe.name}: ${cafe.address}`);

  const cachedData = {
    recommendations: [
      {
        id: cafe.id,
        cafeId: cafe.id,
        name: cafe.name,
        description: cafe.address,
        score: cafe.rating,
        reason: sentiment.sentiment,
        confidenceScore: 1.0,
        metadata: {
          name: cafe.name,
          description: cafe.address,
          sentimentScore:
            sentiment.sentiment === 'positive' ? 1 : sentiment.sentiment === 'neutral' ? 0 : -1,
          tags: sentiment.entities
        }
      }
    ],
    generatedAt: new Date().toISOString(),
    modelVersion: geminiClient.getModelVersion()
  };

  await cache.set(sentimentCacheKey, cachedData);
  return { ...cafe, ...sentiment };
}

/**
 * Gets personalized cafe recommendations for a user
 * @param geminiClient - Gemini client instance with getModelVersion method
 * @param request - Recommendation request object
 * @returns Promise resolving to RecommendationResponse
 * @throws Error if recommendation process fails
 */
export async function getRecommendations(
  geminiClient: GeminiClient & { getModelVersion: () => string },
  request: PersonalizedRecommendationRequest
): Promise<RecommendationResponse> {
  const cacheKey = `recommendations:${request.userId}`;
  const cached = await cache.get(cacheKey);

  if (cached) {
    return {
      status: 'success',
      data: cached.recommendations,
      metadata: {
        generatedAt: cached.generatedAt,
        modelVersion: cached.modelVersion,
        cacheHit: true
      }
    };
  }

  // Rate limiting with exponential backoff
  const now = Date.now();
  const delay = Math.max(0, 1000 / RATE_LIMIT.requestsPerSecond - (now - lastRequestTime));
  if (delay > 0) {
    await setTimeout(delay);
  }
  lastRequestTime = now;

  try {
    const user = await fetchUserData(request.userId);
    const preferences = await fetchUserPreferences(request.userId);
    const favoriteCafes = Array.isArray(preferences.favoriteCafes) ? preferences.favoriteCafes : [];

    const location = request.location || {
      latitude: user.location.coordinates[1],
      longitude: user.location.coordinates[0]
    };
    const cafesData = await fetchCafesData(favoriteCafes, location);

    // Batch sentiment analysis with error handling
    const sentimentResults = await Promise.allSettled(
      cafesData.map((cafe) => analyzeCafeSentiment(geminiClient, cafe))
    );

    const recommendationData = sentimentResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => ({
        id: r.value.id,
        cafeId: r.value.id,
        name: r.value.name,
        description: r.value.address,
        score: r.value.rating,
        reason: r.value.sentiment,
        confidenceScore: 1.0,
        metadata: {
          name: r.value.name,
          description: r.value.address,
          sentimentScore:
            r.value.sentiment === 'positive' ? 1 : r.value.sentiment === 'neutral' ? 0 : -1,
          tags: r.value.entities
        }
      }));

    const metadata = {
      generatedAt: new Date().toISOString(),
      modelVersion: geminiClient.getModelVersion(),
      cacheHit: false
    };

    const response: RecommendationResponse = {
      status: 'success',
      data: recommendationData,
      metadata
    };

    await cache.set(cacheKey, {
      recommendations: recommendationData,
      generatedAt: metadata.generatedAt,
      modelVersion: metadata.modelVersion
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Recommendation error:', {
      error: errorMessage,
      userId: request.userId,
      timestamp: new Date().toISOString()
    });

    return {
      status: 'error',
      message: errorMessage,
      metadata: {
        generatedAt: new Date().toISOString(),
        modelVersion: geminiClient.getModelVersion(),
        cacheHit: false
      }
    };
  }
}
