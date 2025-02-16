import { db } from '@config/db.js';
import { cafes, reviews, users } from '@config/schemas.js';
import { eq, sql, desc, and } from 'drizzle-orm';
import type { GeminiClient } from '@schemas/gemini.js';
import { RecommendationCache } from '@services/cache.js';
import {
  CacheConfig,
  RateLimitConfig,
  DEFAULT_LOCATION,
  CacheKeys,
  type SearchRequest,
  type CafeRecommendation,
  type KeywordMatch,
  type RecommendationResponse,
  type UserPreferences
} from '@schemas/recommendation.js';

class KeywordRecommendationService {
  private cache: RecommendationCache;
  private geminiClient: GeminiClient;
  private lastRequestTime: number = 0;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
    this.cache = new RecommendationCache(CacheConfig);
  }

  async getRecommendations(request: SearchRequest): Promise<RecommendationResponse> {
    try {
      const location = this.getRequestLocation(request);
      let cacheKey: string;

      if (request.userId && request.query) {
        cacheKey = `${CacheKeys.userPreferences(request.userId)}:${CacheKeys.searchQuery(request.query)}`;
      } else if (request.query) {
        cacheKey = CacheKeys.searchQuery(request.query);
      } else if (request.userId) {
        cacheKey = CacheKeys.userPreferences(request.userId);
      } else {
        cacheKey = CacheKeys.locationBased(location.latitude, location.longitude);
      }

      const cached = await this.cache.get<RecommendationResponse>(cacheKey);
      if (cached?.status === 'success') {
        return {
          ...cached,
          metadata: { ...cached.metadata, cached: true }
        };
      }

      await this.applyRateLimit();

      // Get all available keywords
      const searchKeywords = request.query ? await this.analyzeQueryKeywords(request.query) : [];
      let userPrefs: UserPreferences | undefined;
      let preferenceKeywords: KeywordMatch[] = [];

      if (request.userId) {
        userPrefs = await this.getUserPreferences(request.userId);
        preferenceKeywords = this.convertPreferencesToKeywords(userPrefs);
      }

      // Combine keywords with proper weighting
      const combinedKeywords = [
        ...searchKeywords.map((k) => ({ ...k, confidence: k.confidence * 1.5 })), // Prioritize search keywords
        ...preferenceKeywords
      ];

      // Fetch and rank cafes
      const cafes = await this.fetchCafesWithKeywords(combinedKeywords, location, request.filters);
      const recommendations = await this.rankAndScoreCafes(
        cafes,
        combinedKeywords,
        location,
        userPrefs,
        searchKeywords.length > 0
      );

      const response: RecommendationResponse = {
        status: 'success',
        data: recommendations,
        metadata: {
          total: recommendations.length,
          cached: false,
          generatedAt: new Date().toISOString(),
          source: request.query ? 'search' : request.userId ? 'preferences' : 'location'
        }
      };

      await this.cache.set(cacheKey, response);
      return response;
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
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

  private getRequestLocation(request: SearchRequest): { latitude: number; longitude: number } {
    if (request.location) {
      return request.location;
    }
    return {
      latitude: DEFAULT_LOCATION.coordinates[1],
      longitude: DEFAULT_LOCATION.coordinates[0]
    };
  }

  private async analyzeQueryKeywords(query: string): Promise<KeywordMatch[]> {
    const cacheKey = CacheKeys.keywordAnalysis([query]);
    const cached = await this.cache.get<KeywordMatch[]>(cacheKey);

    if (cached) {
      return cached;
    }

    await this.applyRateLimit();

    const prompt = `Analyze this café search query and extract relevant keywords.
    Query: "${query}"
    Return a JSON array of keywords in this exact format, with no markdown formatting or additional text:
    [{"keyword": "example", "confidence": 0.9, "category": "ambiance"}]`;

    try {
      const response = await this.geminiClient.generateContent(prompt);
      const responseText = response
        .text()
        .replace(/```json\n|\n```|```/g, '')
        .trim();
      const keywords = JSON.parse(responseText) as KeywordMatch[];
      await this.cache.set(cacheKey, keywords, CacheConfig.keywordAnalysisTTL);
      return keywords;
    } catch (error) {
      console.error('Failed to analyze keywords:', error);
      return [];
    }
  }

  private convertPreferencesToKeywords(prefs: UserPreferences): KeywordMatch[] {
    const keywords: KeywordMatch[] = [];

    for (const category of ['dietary', 'ambiance', 'activities'] as const) {
      prefs.preferences[category]?.forEach((pref) => {
        keywords.push({
          keyword: pref,
          confidence: 1.0,
          category: category === 'activities' ? 'activity' : category
        });
      });
    }

    return keywords;
  }

  private async fetchCafesWithKeywords(
    keywords: KeywordMatch[],
    location: { latitude: number; longitude: number },
    filters?: SearchRequest['filters']
  ) {
    const keywordArray = keywords.map((k) => k.keyword);
    console.log('Searching with keywords:', keywordArray);

    const keywordConditions =
      keywords.length > 0
        ? sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(${cafes.keywords}) AS k
          WHERE k = ANY(array[${sql.join(keywordArray, sql`, `)}])
        )`
        : sql`TRUE`;

    const filterConditions = this.buildNonDistanceFilters(filters);
    console.log('Applied filters:', filters);

    const distanceCalc = sql<number>`
      111.111 *
      SQRT(
        POW(${location.latitude} - CAST(CAST(${cafes.location}->>'coordinates' AS json)->>1 AS float), 2) +
        POW(${location.longitude} - CAST(CAST(${cafes.location}->>'coordinates' AS json)->>0 AS float), 2)
      )
    `;

    // First, get the aggregated review data in a subquery
    const reviewSubquery = db
      .select({
        cafeId: reviews.cafeId,
        avgRating:
          sql<number>`COALESCE(AVG(CAST(${reviews.rating}->>'rating' AS numeric)), 3.5)`.as(
            'avg_rating'
          ),
        reviewCount: sql<number>`COUNT(${reviews.id})`.as('review_count')
      })
      .from(reviews)
      .groupBy(reviews.cafeId)
      .as('review_stats');

    const results = await db
      .select({
        id: cafes.id,
        name: cafes.name,
        description: cafes.description,
        address: cafes.address,
        keywords: cafes.keywords,
        location: cafes.location,
        photos: cafes.photos,
        rating: sql<number>`COALESCE(review_stats.avg_rating, 3.5)`,
        reviewCount: sql<number>`COALESCE(review_stats.review_count, 0)`,
        distance: distanceCalc
      })
      .from(cafes)
      .leftJoin(reviewSubquery, eq(reviewSubquery.cafeId, cafes.id))
      .where(
        sql`
        ${and(keywordConditions, filterConditions)}
        AND (${distanceCalc} <= ${filters?.radius || 999999})
      `
      )
      .orderBy(desc(sql`COALESCE(review_stats.avg_rating, 3.5)`));

    console.log('Found cafes:', results.length);
    if (results.length === 0) {
      console.log('No cafes found matching criteria. Trying without distance filter...');
      // Try without distance filter to see if that's the limiting factor
      const resultsWithoutDistance = await db
        .select({
          id: cafes.id,
          name: cafes.name,
          keywords: cafes.keywords,
          location: cafes.location
        })
        .from(cafes)
        .where(and(keywordConditions, filterConditions));

      console.log('Cafes without distance filter:', resultsWithoutDistance.length);
      if (resultsWithoutDistance.length === 0) {
        console.log('Still no cafes found. Checking individual conditions...');
        // Check just keywords
        const cafesByKeywords = await db
          .select({ id: cafes.id, keywords: cafes.keywords })
          .from(cafes)
          .where(keywordConditions);
        console.log('Cafes matching keywords:', cafesByKeywords.length);

        // Check just filters
        const cafesByFilters = await db
          .select({ id: cafes.id })
          .from(cafes)
          .where(filterConditions);
        console.log('Cafes matching filters:', cafesByFilters.length);
      }
    }

    return results;
  }

  private buildNonDistanceFilters(filters?: SearchRequest['filters']) {
    if (!filters) return sql`TRUE`;

    const conditions = [];

    if (filters.dietary?.length) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${cafes.dietaryOptions}) AS d
        WHERE d = ANY(array[${sql.join(filters.dietary, sql`, `)}])
      )`);
    }
    if (filters.ambiance?.length) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${cafes.ambiance}) AS a
        WHERE a = ANY(array[${sql.join(filters.ambiance, sql`, `)}])
      )`);
    }
    if (filters.activities?.length) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${cafes.keywords}) AS k
        WHERE k = ANY(array[${sql.join(filters.activities, sql`, `)}])
      )`);
    }

    return conditions.length > 0 ? sql.join(conditions, sql` AND `) : sql`TRUE`;
  }

  private async fetchPopularCafesNearLocation(location: { latitude: number; longitude: number }) {
    return db
      .select({
        id: cafes.id,
        name: cafes.name,
        description: cafes.description,
        address: cafes.address,
        keywords: cafes.keywords,
        location: cafes.location,
        photos: cafes.photos,
        rating: sql<number>`COALESCE(AVG(${reviews.rating}::numeric), 3.5)`,
        reviewCount: sql<number>`COUNT(${reviews.id})`,
        distance: sql<number>`
          111.111 *
          SQRT(
            POW(${location.latitude} - CAST(CAST(${cafes.location}->>'coordinates' AS json)->>1 AS float), 2) +
            POW(${location.longitude} - CAST(CAST(${cafes.location}->>'coordinates' AS json)->>0 AS float), 2)
          )
        `
      })
      .from(cafes)
      .leftJoin(reviews, eq(reviews.cafeId, cafes.id))
      .groupBy(cafes.id)
      .having(sql`COUNT(${reviews.id}) >= 5`)
      .orderBy(desc(sql`rating`), sql`distance`);
  }

  private buildFilterConditions(filters?: SearchRequest['filters']) {
    if (!filters) return sql`TRUE`;

    const conditions = [];

    if (filters.dietary?.length) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${cafes.dietaryOptions}) AS d
        WHERE d = ANY(array[${sql.join(filters.dietary, sql`, `)}])
      )`);
    }
    if (filters.ambiance?.length) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${cafes.ambiance}) AS a
        WHERE a = ANY(array[${sql.join(filters.ambiance, sql`, `)}])
      )`);
    }
    if (filters.activities?.length) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${cafes.keywords}) AS k
        WHERE k = ANY(array[${sql.join(filters.activities, sql`, `)}])
      )`);
    }
    if (filters.radius) {
      conditions.push(sql`distance <= ${filters.radius}`);
    }

    return conditions.length > 0 ? sql.join(conditions, sql` AND `) : sql`TRUE`;
  }

  private getMatchingKeywords(
    cafeKeywords: string[],
    searchKeywords: KeywordMatch[]
  ): KeywordMatch[] {
    return searchKeywords.filter((k) => cafeKeywords.includes(k.keyword));
  }

  private calculateScore(
    cafe: any,
    keywords: KeywordMatch[],
    userPrefs?: UserPreferences,
    hasSearchQuery: boolean = false
  ): number {
    // Split keywords by source
    const searchKeywords = keywords.filter((k) => k.confidence > 1.0);
    const prefKeywords = keywords.filter((k) => k.confidence <= 1.0);

    // Calculate individual scores
    const searchScore =
      searchKeywords.length > 0
        ? this.getMatchingKeywords(cafe.keywords, searchKeywords).reduce(
            (sum, k) => sum + k.confidence / 1.5,
            0
          ) / searchKeywords.length
        : 0.5;

    const prefScore =
      prefKeywords.length > 0
        ? this.getMatchingKeywords(cafe.keywords, prefKeywords).reduce(
            (sum, k) => sum + k.confidence,
            0
          ) / prefKeywords.length
        : 0.5;

    const ratingScore = (cafe.rating - 3.5) / 1.5;
    const distanceScore = cafe.distance ? Math.max(0, 1 - cafe.distance / 10000) : 0.5;

    // Adjust weights based on available data
    const weights = {
      search: hasSearchQuery ? 0.4 : 0,
      preferences: userPrefs ? 0.3 : 0,
      rating: 0.2,
      distance: 0.1
    };

    // Normalize weights
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    Object.keys(weights).forEach((key) => {
      weights[key as keyof typeof weights] /= totalWeight;
    });

    return (
      searchScore * weights.search +
      prefScore * weights.preferences +
      ratingScore * weights.rating +
      distanceScore * weights.distance
    );
  }

  private async rankAndScoreCafes(
    cafes: any[],
    keywords: KeywordMatch[],
    location: { latitude: number; longitude: number },
    userPrefs?: UserPreferences,
    hasSearchQuery: boolean = false
  ): Promise<CafeRecommendation[]> {
    return cafes
      .map((cafe) => {
        const cafeLocation = JSON.parse(cafe.location);
        return {
          id: cafe.id,
          name: cafe.name,
          description: cafe.description,
          address: cafe.address,
          distance: cafe.distance,
          matchingKeywords: this.getMatchingKeywords(cafe.keywords, keywords),
          score: this.calculateScore(cafe, keywords, userPrefs, hasSearchQuery),
          metadata: {
            rating: cafe.rating,
            reviewCount: cafe.reviewCount,
            keywords: cafe.keywords,
            location: {
              coordinates: [cafeLocation.coordinates[0], cafeLocation.coordinates[1]] as [
                number,
                number
              ],
              type: 'Point' as const
            },
            photos: cafe.photos
          }
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    const userPrefs = await db
      .select({
        preferences: users.preferences,
        favoriteCafes: users.favoriteCafes
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userPrefs.length) {
      return {
        userId,
        preferences: {
          dietary: [],
          ambiance: [],
          activities: []
        }
      };
    }

    return {
      userId,
      preferences: userPrefs[0].preferences || {
        dietary: [],
        ambiance: [],
        activities: []
      },
      favoriteCafes: userPrefs[0].favoriteCafes || undefined
    };
  }

  private async applyRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / RateLimitConfig.requestsPerSecond;

    if (timeSinceLastRequest < minInterval) {
      await new Promise((resolve) => setTimeout(resolve, minInterval - timeSinceLastRequest));
    }

    this.lastRequestTime = now;
  }
}

export default KeywordRecommendationService;
