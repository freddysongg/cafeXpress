import { db } from '@config/db.js';
import { cafes, reviews, users, preferences } from '@config/schemas.js';
import { eq, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { setTimeout } from 'timers/promises';
import type { GeminiClient } from '@schemas/gemini.js';
import { RecommendationCache } from '@services/cache.js';
import { SemanticSearchService } from '@services/semanticSearch.js';
import { SentimentAnalysisService } from '@services/sentimentAnalysis.js';
import { EmbeddingSchema } from '@schemas/semantic.js';
import type { ISemanticSearchService, Embedding } from '@schemas/semantic.js';
import {
  RecommendationResponse,
  UserWithLocation,
  Location,
  personalizedRecommendationRequest,
  preferencesSchema,
  CACHE_CONFIG,
  RATE_LIMIT,
  CachedSentiment
} from '@schemas/recommendation.js';

const cache = new RecommendationCache({
  ttl: CACHE_CONFIG.ttl,
  prefix: 'recommendation:',
  maxSize: CACHE_CONFIG.maxSize,
  staleWhileRevalidate: CACHE_CONFIG.staleWhileRevalidate
});
let lastRequestTime = 0;

let semanticSearchService: ISemanticSearchService;
let sentimentAnalysisService: SentimentAnalysisService;

export function initializeRecommendationService(geminiClient: GeminiClient): void {
  semanticSearchService = new SemanticSearchService(geminiClient);
  sentimentAnalysisService = new SentimentAnalysisService(geminiClient);
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
  // Create materialized view if it doesn't exist
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

  // Refresh materialized view
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

class ScoringHelper {
  static calculateHybridScore(
    rating: number,
    semanticScore: number,
    sentiment: { positive: number; negative: number; neutral: number; compound: number }
  ): number {
    if (isNaN(rating) || isNaN(semanticScore)) return 0;

    const weights = {
      semantic: process.env.SEMANTIC_WEIGHT ? parseFloat(process.env.SEMANTIC_WEIGHT) : 0.5,
      rating: process.env.RATING_WEIGHT ? parseFloat(process.env.RATING_WEIGHT) : 0.4,
      sentiment: process.env.SENTIMENT_WEIGHT ? parseFloat(process.env.SENTIMENT_WEIGHT) : 0.1
    };

    const totalWeight = Math.max(weights.semantic + weights.rating + weights.sentiment, 0.001);
    const normalizedWeights = {
      semantic: weights.semantic / totalWeight,
      rating: weights.rating / totalWeight,
      sentiment: weights.sentiment / totalWeight
    };

    const sentimentMultiplier =
      sentiment.compound >= 0.5 ? 1.2 : sentiment.compound <= -0.5 ? 0.8 : 1.0;

    const baseScore =
      rating * normalizedWeights.rating + semanticScore * normalizedWeights.semantic;
    return baseScore * sentimentMultiplier * normalizedWeights.sentiment;
  }

  static getSentimentReason(compound: number): string {
    if (compound >= 0.5) return 'Very positive reviews';
    if (compound >= 0.05) return 'Positive reviews';
    if (compound <= -0.5) return 'Very negative reviews';
    if (compound <= -0.05) return 'Negative reviews';
    return 'Mixed reviews';
  }
}

export async function getRecommendations(
  geminiClient: GeminiClient & { getModelVersion: () => string },
  request: z.infer<typeof personalizedRecommendationRequest>
): Promise<RecommendationResponse> {
  if (!semanticSearchService || !sentimentAnalysisService) {
    throw new Error('Recommendation services not initialized');
  }

  const cacheKey = `recommendations:${request.userId}`;
  const cached = await cache.get<CachedSentiment>(cacheKey);

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

    const sentimentResults = await Promise.allSettled(
      cafesData.map(async (cafe) => {
        try {
          const cafeText = `${cafe.name}: ${cafe.description || cafe.address}`;

          const sentimentAnalysis = await sentimentAnalysisService.analyzeSentiment(cafeText);

          let semanticScore = 0.5;
          if (cafe.semanticEmbedding && preferences.semanticEmbedding) {
            try {
              semanticScore = await semanticSearchService.calculateSemanticScore(
                cafe.semanticEmbedding,
                preferences.semanticEmbedding
              );
            } catch (error) {
              console.error('Failed to calculate semantic score:', error);
            }
          }

          return {
            ...cafe,
            sentiment: {
              positive: sentimentAnalysis.score.positive,
              negative: sentimentAnalysis.score.negative,
              neutral: sentimentAnalysis.score.neutral,
              compound: sentimentAnalysis.score.compound
            },
            semanticScore,
            sentimentKeywords: sentimentAnalysis.matchedSentimentKeywords,
            rating: cafe.rating || 3.5
          };
        } catch (error) {
          console.error(`Failed to process cafe ${cafe.id}:`, error);
          throw error;
        }
      })
    );

    const successfulResults = sentimentResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    const recommendations = successfulResults
      .map((result) => ({
        id: result.id,
        cafeId: result.id,
        name: result.name,
        description: result.description || result.address,
        score: ScoringHelper.calculateHybridScore(
          result.rating,
          result.semanticScore,
          result.sentiment
        ),
        reason: ScoringHelper.getSentimentReason(result.sentiment.compound),
        confidenceScore: Math.min(
          1,
          (result.semanticScore + result.sentiment.positive + result.rating / 5) / 3
        ),
        metadata: {
          name: result.name,
          description: result.description || result.address,
          address: result.address,
          rating: result.rating,
          reviewCount: result.reviewCount,
          lastReviewDate: result.lastReviewDate,
          location: location,
          tags: result.sentimentKeywords,
          sentimentScore: result.sentiment
        }
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const generatedAt = new Date().toISOString();
    const modelVersion = geminiClient.getModelVersion();

    await cache.set(cacheKey, {
      recommendations,
      generatedAt,
      modelVersion
    });

    return {
      status: 'success',
      data: recommendations,
      metadata: {
        generatedAt,
        modelVersion,
        cacheHit: false
      }
    };
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
