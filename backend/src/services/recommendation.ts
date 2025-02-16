import { db } from '@config/db.js';
import { cafes, users, reviews } from '@config/schemas.js';
import { eq, sql } from 'drizzle-orm';
import { setTimeout } from 'timers/promises';
import type { GeminiClient } from '@schemas/gemini.js';
import { RecommendationCache } from '@services/cache.js';
import {
  RecommendationResponse,
  type Location,
  type UserPreferences,
  type SearchRequest,
  type CafeRecommendation,
  CacheConfig,
  RateLimitConfig,
  DEFAULT_LOCATION,
  CacheKeys
} from '@schemas/recommendation.js';

class KeywordRecommendationService {
  private cache: RecommendationCache;
  private lastRequestTime: number = 0;

  constructor(private geminiClient: GeminiClient) {
    this.cache = new RecommendationCache({
      ttl: CacheConfig.searchQueryTTL,
      prefix: 'recommendation:',
      maxSize: CacheConfig.maxSize,
      staleWhileRevalidate: CacheConfig.searchQueryTTL / 2
    });
  }

  private async fetchUserData(userId: string): Promise<UserPreferences & { location?: Location }> {
    const [user] = await db
      .select({
        id: users.id,
        preferences: users.preferences,
        location: users.location
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      userId: user.id,
      preferences: user.preferences || {
        dietary: [],
        ambiance: [],
        activities: []
      },
      location: user.location || undefined
    };
  }

  private async fetchCafesData(
    favoriteCafes: string[] | null,
    location: { latitude: number; longitude: number }
  ): Promise<CafeRecommendation[]> {
    const baseQuery = db
      .select({
        id: cafes.id,
        name: cafes.name,
        address: cafes.address,
        description: cafes.description,
        keywords: cafes.keywords,
        photos: cafes.photos,
        location: cafes.location,
        rating: sql<number>`COALESCE(AVG(CAST(${reviews.rating} AS numeric)), 3.5)`,
        reviewCount: sql<number>`COUNT(${reviews.id})`,
        distance: sql<number>`
          ST_Distance(
            ST_SetSRID(ST_MakePoint(${location.longitude}, ${location.latitude}), 4326),
            ST_SetSRID(ST_MakePoint(
              CAST(json_extract_path_text(${cafes.location}::text, 'coordinates', '0') AS float),
              CAST(json_extract_path_text(${cafes.location}::text, 'coordinates', '1') AS float)
            ), 4326)
          )
        `
      })
      .from(cafes)
      .leftJoin(reviews, eq(reviews.cafeId, cafes.id))
      .where(favoriteCafes ? sql`${cafes.id} = ANY(${favoriteCafes})` : sql`TRUE`)
      .groupBy(cafes.id);

    const results = await baseQuery.orderBy(sql`distance`).limit(20);

    return results.map((cafe) => ({
      id: cafe.id,
      name: cafe.name,
      address: cafe.address,
      description: cafe.description || undefined,
      matchingKeywords: [],
      score: cafe.rating,
      metadata: {
        rating: cafe.rating,
        reviewCount: cafe.reviewCount,
        location: cafe.location || DEFAULT_LOCATION,
        keywords: cafe.keywords || [],
        photos: cafe.photos || undefined
      }
    }));
  }

  private async applyRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / RateLimitConfig.requestsPerSecond;

    if (timeSinceLastRequest < minInterval) {
      await setTimeout(minInterval - timeSinceLastRequest);
    }

    this.lastRequestTime = now;
  }

  async getRecommendations(request: SearchRequest): Promise<RecommendationResponse> {
    try {
      const cacheKey = request.userId
        ? CacheKeys.userPreferences(request.userId)
        : request.query
          ? CacheKeys.searchQuery(request.query)
          : CacheKeys.locationBased(
              request.location?.latitude || DEFAULT_LOCATION.coordinates[1],
              request.location?.longitude || DEFAULT_LOCATION.coordinates[0]
            );

      const cached = await this.cache.get<RecommendationResponse>(cacheKey);
      if (cached?.status === 'success') {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cached: true
          }
        };
      }

      await this.applyRateLimit();

      let location = request.location;
      let favoriteCafes: string[] | null = null;

      if (request.userId) {
        const user = await this.fetchUserData(request.userId);
        if (!location && user.location) {
          location = {
            latitude: user.location.coordinates[1],
            longitude: user.location.coordinates[0]
          };
        }
        favoriteCafes = (user.preferences as any).favoriteCafes || null;
      }

      if (!location) {
        location = {
          latitude: DEFAULT_LOCATION.coordinates[1],
          longitude: DEFAULT_LOCATION.coordinates[0]
        };
      }

      const recommendations = await this.fetchCafesData(favoriteCafes, location);

      const response: RecommendationResponse = {
        status: 'success',
        data: recommendations,
        metadata: {
          total: recommendations.length,
          cached: false,
          generatedAt: new Date().toISOString(),
          source: request.userId ? 'preferences' : request.query ? 'search' : 'location'
        }
      };

      await this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Recommendation generation failed:', error);
      return {
        status: 'error',
        data: [],
        metadata: {
          total: 0,
          cached: false,
          generatedAt: new Date().toISOString(),
          source: 'search'
        }
      };
    }
  }
}

export default KeywordRecommendationService;
