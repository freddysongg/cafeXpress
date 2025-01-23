import { db } from '@config/db.js';
import { cafes, reviews, users, preferences } from '@config/schemas.js';
import { eq, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { setTimeout } from 'timers/promises';
import type { GeminiClient } from '@schemas/gemini.js';
import { RecommendationCache } from '@services/cache.js';
import { SemanticSearchService } from '@services/semanticSearch.js';
import { EmbeddingSchema } from '@schemas/semantic.js';
import type { ISemanticSearchService } from '@services/semanticSearch.js';
import type { Embedding } from '@schemas/semantic.js';
import {
  RecommendationResponse,
  UserWithLocation,
  Location,
  personalizedRecommendationRequest,
  preferencesSchema
} from '@schemas/recommendation.js';

const CACHE_CONFIG = {
  ttl: 30 * 60 * 1000,
  maxSize: 5000,
  staleWhileRevalidate: 15 * 60 * 1000,
  embeddingTtl: 12 * 60 * 60 * 1000,
  cachePartitions: {
    recommendations: { ttl: 60 * 60 * 1000, maxSize: 1000 },
    embeddings: { ttl: 12 * 60 * 60 * 1000, maxSize: 10000 },
    sentiment: { ttl: 6 * 60 * 60 * 1000, maxSize: 5000 }
  }
};

const RATE_LIMIT = {
  requestsPerSecond: 5,
  maxRetries: 3,
  initialRetryDelay: 1000,
  backoffFactor: 2,
  embeddingRetries: 5,
  embeddingDelay: 2000
};

const cache = new RecommendationCache(CACHE_CONFIG);
let lastRequestTime = 0;

let semanticSearchService: ISemanticSearchService;

export function initializeRecommendationService(geminiClient: GeminiClient): void {
  semanticSearchService = new SemanticSearchService(geminiClient);
  semanticSearchService.initialize();
}

async function fetchUserData(userId: string): Promise<UserWithLocation> {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      description: users.description,
      location: sql<Location>`${users.location}`,
      preferencesEmbedding: sql<
        z.infer<typeof preferencesSchema>['semanticEmbedding']
      >`${users.preferencesEmbedding}`
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.preferencesEmbedding && user.description) {
    const embedding = await semanticSearchService.generateEmbedding({
      type: 'user',
      id: userId,
      text: user.description
    });

    const parsedEmbedding = EmbeddingSchema.safeParse({
      vector: embedding.vector,
      metadata: {
        type: 'user',
        id: userId,
        createdAt: new Date()
      }
    });

    if (!parsedEmbedding.success) {
      throw new Error('Invalid embedding data: ' + parsedEmbedding.error.message);
    }

    const embeddingData = parsedEmbedding.data;
    await db
      .update(users)
      .set({ preferencesEmbedding: sql`${JSON.stringify(embeddingData)}` })
      .where(eq(users.id, userId));
    user.preferencesEmbedding = embeddingData;
  }

  return user;
}

async function fetchUserPreferences(userId: string): Promise<z.infer<typeof preferencesSchema>> {
  const [prefs] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, userId))
    .limit(1);

  if (!prefs) {
    throw new Error('User preferences not found');
  }

  // Validate preferences against schema
  // Parse and validate preferences data
  const parsedPrefs = preferencesSchema.safeParse({
    ...prefs,
    favoriteCafes: prefs.favoriteCafes || [],
    semanticEmbedding: prefs.semanticEmbedding || null
  });
  if (!parsedPrefs.success) {
    throw new Error('Invalid preferences data: ' + parsedPrefs.error.message);
  }

  const validatedPrefs: z.infer<typeof preferencesSchema> = parsedPrefs.data;

  // Generate and validate semantic embedding if missing
  if (!validatedPrefs.semanticEmbedding) {
    const embedding = await semanticSearchService.generateEmbedding({
      type: 'preferences',
      id: userId,
      text: JSON.stringify(prefs)
    });

    const embeddingParseResult = EmbeddingSchema.safeParse({
      vector: embedding.vector,
      metadata: {
        type: 'preferences',
        id: userId,
        createdAt: new Date()
      }
    });

    if (!embeddingParseResult.success) {
      throw new Error('Invalid embedding data: ' + embeddingParseResult.error.message);
    }

    const embeddingData = embeddingParseResult.data;
    await db
      .update(preferences)
      .set({ semanticEmbedding: sql`${JSON.stringify(embeddingData)}` })
      .where(eq(preferences.userId, userId));
    validatedPrefs.semanticEmbedding = embeddingData;
  }

  return validatedPrefs;
}

async function fetchCafesData(
  favoriteCafes: string[] | null,
  location?: { latitude: number; longitude: number }
): Promise<
  Array<{
    id: string;
    name: string;
    address: string;
    description?: string;
    rating: number;
    semanticEmbedding?: z.infer<typeof EmbeddingSchema>;
    reviewCount: number;
    lastReviewDate: Date;
  }>
> {
  await db.execute(sql`
    CREATE MATERIALIZED VIEW IF NOT EXISTS cafe_summary AS
    SELECT 
      c.id,
      c.name,
      c.address,
      c.description,
      c.semantic_embedding,
      AVG(r.rating) AS average_rating,
      COUNT(r.id) AS review_count,
      MAX(r.created_at) AS last_review_date
    FROM cafes c
    LEFT JOIN reviews r ON c.id = r.cafe_id
    GROUP BY c.id
  `);

  await db.execute(sql`REFRESH MATERIALIZED VIEW cafe_summary`);

  const baseQuery = db
    .select({
      id: sql`cs.id`,
      name: sql`cs.name`,
      address: sql`cs.address`,
      description: sql`cs.description`,
      rating: sql`cs.average_rating`,
      distance: location
        ? sql`
          ST_Distance(
            ST_SetSRID(ST_MakePoint((c.location->'coordinates'->>0)::float, (c.location->'coordinates'->>1)::float), 4326),
            ST_SetSRID(ST_MakePoint(${location.longitude}, ${location.latitude}), 4326)
          )
        `.as('distance')
        : sql`NULL`.as('distance'),
      semanticEmbedding: sql<Embedding | null>`cs.semantic_embedding`,
      reviewCount: sql`cs.review_count`,
      lastReviewDate: sql`cs.last_review_date`
    })
    .from(sql`cafe_summary cs`)
    .leftJoin(sql`cafes c`, sql`c.id = cs.id`)
    .where(favoriteCafes ? sql`cs.id = ANY(${favoriteCafes})` : sql`TRUE`);

  const results = await baseQuery
    .orderBy(location ? sql`distance` : desc(sql`AVG(${reviews.rating})`))
    .limit(20);

  const typedResults = results.map((cafe) => ({
    id: cafe.id as string,
    name: cafe.name as string,
    address: cafe.address as string,
    description: cafe.description as string | undefined,
    rating: parseFloat(cafe.rating as string),
    semanticEmbedding: cafe.semanticEmbedding as z.infer<typeof EmbeddingSchema> | undefined,
    reviewCount: parseInt(cafe.reviewCount as string, 10),
    lastReviewDate: new Date(cafe.lastReviewDate as string)
  }));

  await Promise.all(
    typedResults.map(async (cafe) => {
      if (!cafe.semanticEmbedding) {
        const embedding = await semanticSearchService.generateEmbedding({
          type: 'cafe',
          id: cafe.id,
          text: `${cafe.name}: ${cafe.description || cafe.address}`
        });
        const parsedEmbedding = EmbeddingSchema.safeParse({
          vector: embedding.vector,
          metadata: {
            type: 'cafe',
            id: cafe.id,
            createdAt: new Date()
          }
        });

        if (!parsedEmbedding.success) {
          throw new Error('Invalid embedding data: ' + parsedEmbedding.error.message);
        }

        const embeddingData = parsedEmbedding.data;
        await db
          .update(cafes)
          .set({
            semanticEmbedding: sql`${JSON.stringify(embeddingData)}`
          })
          .where(eq(cafes.id, cafe.id));
        cafe.semanticEmbedding = embeddingData;
      }
    })
  );

  return typedResults;
}

async function analyzeCafeSentiment(
  geminiClient: GeminiClient,
  cafe: {
    id: string;
    name: string;
    address: string;
    description?: string;
    rating: number;
    semanticEmbedding?: z.infer<typeof EmbeddingSchema>;
    reviewCount: number;
    lastReviewDate: Date;
  },
  preferences: z.infer<typeof preferencesSchema>
) {
  const preferencesEmbedding = preferences.semanticEmbedding;
  const sentimentCacheKey = `sentiment:${cafe.id}`;
  const cachedSentiment = await cache.get(sentimentCacheKey);

  if (cachedSentiment) {
    return { ...cafe, ...cachedSentiment };
  }

  const text = `${cafe.name}: ${cafe.address}. ${cafe.description || ''}`;
  const sentimentResponse = await geminiClient.analyzeText(text);
  const sentiment = {
    positive: sentimentResponse.sentiment.positive,
    negative: sentimentResponse.sentiment.negative,
    neutral: sentimentResponse.sentiment.neutral,
    compound: sentimentResponse.sentiment.compound
  };
  const entities = sentimentResponse.entities;

  const semanticScore =
    cafe.semanticEmbedding && preferences.semanticEmbedding
      ? await semanticSearchService.calculateSimilarity(
          { vector: cafe.semanticEmbedding.vector, metadata: cafe.semanticEmbedding.metadata },
          {
            vector: preferences.semanticEmbedding.vector,
            metadata: preferences.semanticEmbedding.metadata
          }
        )
      : 0;

  const cachedData = {
    recommendations: [
      {
        id: cafe.id,
        cafeId: cafe.id,
        name: cafe.name,
        description: cafe.description || cafe.address,
        score: calculateHybridScore(cafe.rating, semanticScore, sentiment),
        reason:
          sentiment.compound >= 0.5
            ? 'positive'
            : sentiment.compound <= -0.5
              ? 'negative'
              : 'neutral',
        confidenceScore: 1.0,
        metadata: {
          name: cafe.name,
          description: cafe.description || cafe.address,
          sentimentScore: sentiment,
          semanticScore,
          tags: entities
        }
      }
    ],
    generatedAt: new Date().toISOString(),
    modelVersion: geminiClient.getModelVersion()
  };

  await cache.set(sentimentCacheKey, cachedData);
  return {
    ...cafe,
    sentiment: sentiment,
    semanticScore
  };
}

function calculateHybridScore(
  rating: number,
  semanticScore: number,
  sentiment: { positive: number; negative: number; neutral: number; compound: number }
): number {
  if (isNaN(rating) || isNaN(semanticScore)) {
    return 0;
  }
  const sentimentWeight = sentiment.compound >= 0.5 ? 1.2 : sentiment.compound <= -0.5 ? 0.8 : 1.0;
  const semanticWeight = 0.4;
  const ratingWeight = 0.6;

  return (rating * ratingWeight + semanticScore * semanticWeight) * sentimentWeight;
}

export async function getRecommendations(
  geminiClient: GeminiClient & { getModelVersion: () => string },
  request: z.infer<typeof personalizedRecommendationRequest>
): Promise<RecommendationResponse> {
  // Validate request against schema
  const parsedRequest = personalizedRecommendationRequest.parse(request);
  if (!semanticSearchService) {
    throw new Error('SemanticSearchService not initialized');
  }

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

    const location =
      request.location ||
      (user.location && {
        latitude: user.location.coordinates[1],
        longitude: user.location.coordinates[0]
      });
    const cafesData = await fetchCafesData(favoriteCafes, location);

    const analysisResults = await Promise.allSettled(
      cafesData.map(async (cafe) => {
        const sentiment = await analyzeCafeSentiment(geminiClient, cafe, preferences);
        const semanticScore =
          cafe.semanticEmbedding && preferences.semanticEmbedding
            ? await semanticSearchService.calculateSemanticScore(
                cafe.semanticEmbedding,
                preferences.semanticEmbedding
              )
            : 0;
        return { ...sentiment, semanticScore };
      })
    );

    const recommendationData = analysisResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => ({
        id: r.value.id,
        cafeId: r.value.id,
        name: r.value.name,
        description: r.value.description || r.value.address,
        score: calculateHybridScore(r.value.rating, r.value.semanticScore, r.value.sentiment),
        reason: r.value.sentiment,
        confidenceScore: 1.0,
        metadata: {
          rating: r.value.rating,
          semanticScore: r.value.semanticScore,
          sentiment: {
            positive: r.value.sentiment.positive,
            negative: r.value.sentiment.negative,
            neutral: r.value.sentiment.neutral,
            compound: r.value.sentiment.compound
          },
          reviewCount: r.value.reviewCount,
          lastReviewDate: r.value.lastReviewDate
        }
      }));

    const recommendations = recommendationData.sort((a, b) => b.score - a.score).slice(0, 10);

    const cacheData = {
      recommendations: recommendations.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        cafeId: r.cafeId,
        score: r.score,
        reason: r.reason,
        confidenceScore: r.confidenceScore,
        metadata: {
          name: r.name,
          description: r.description,
          sentiment: r.metadata.sentiment,
          tags: []
        }
      })),
      generatedAt: new Date().toISOString(),
      modelVersion: geminiClient.getModelVersion()
    };

    const response: RecommendationResponse = {
      status: 'success',
      data: cacheData.recommendations,
      metadata: {
        generatedAt: cacheData.generatedAt,
        modelVersion: cacheData.modelVersion,
        cacheHit: false
      }
    };

    await cache.set(cacheKey, cacheData);
    return response;
  } catch (error) {
    console.error('Recommendation generation failed:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to generate recommendations',
      data: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        modelVersion: geminiClient.getModelVersion(),
        cacheHit: false
      }
    };
  }
}
