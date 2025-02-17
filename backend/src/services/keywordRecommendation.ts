import { db } from '@config/db.js';
import { cafes, reviews, users } from '@config/schemas.js';
import { eq, sql, desc } from 'drizzle-orm';
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
  type UserPreferences,
  FetchCafesResult
} from '@schemas/recommendation.js';
import * as cafeQueries from '@services/queries/cafeQueries.js';

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
      const page = request.page || 1;

      console.log('Search query:', request.query);

      const searchKeywords = request.query ? await this.analyzeQueryKeywords(request.query) : [];
      console.log('Analyzed search keywords:', searchKeywords);

      let userPrefs: UserPreferences | undefined;
      let preferenceKeywords: KeywordMatch[] = [];

      if (request.userId) {
        userPrefs = await this.getUserPreferences(request.userId);
        preferenceKeywords = this.convertPreferencesToKeywords(userPrefs);
      }

      const combinedKeywords = [
        ...searchKeywords.map((k) => ({ ...k, confidence: k.confidence * 1.5 })),
        ...preferenceKeywords
      ];
      console.log('Combined keywords:', combinedKeywords);

      const { results: cafes, pagination } = await this.fetchCafesWithKeywords(
        combinedKeywords,
        location,
        request.filters,
        page
      );

      const recommendations = await this.rankAndScoreCafes(
        cafes,
        combinedKeywords,
        location,
        userPrefs,
        searchKeywords.length > 0
      );

      return {
        status: 'success',
        data: recommendations,
        metadata: {
          total: pagination.totalCount,
          cached: false,
          generatedAt: new Date().toISOString(),
          source: request.query ? 'search' : request.userId ? 'preferences' : 'location',
          pagination: {
            currentPage: pagination.currentPage,
            totalPages: pagination.totalPages,
            hasMore: pagination.hasMore
          }
        }
      };
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return {
        status: 'error',
        data: [],
        metadata: {
          total: 0,
          cached: false,
          generatedAt: new Date().toISOString(),
          source: 'search',
          pagination: {
            currentPage: 1,
            totalPages: 1,
            hasMore: false
          }
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
    Return a JSON array of keywords with categories (ambiance, dietary, general) in this exact format:
    [{"keyword": "example", "confidence": 0.9, "category": "ambiance"}]
    For ambiance words like: cozy, rustic, modern, vibrant
    For dietary words like: vegan, gluten-free, organic
    For general words like: cafe, coffee, tea`;

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
    filters?: SearchRequest['filters'],
    page: number = 1
  ): Promise<FetchCafesResult> {
    const PAGE_SIZE = 10;
    const MAX_RESULTS = 50;
    const offset = (page - 1) * PAGE_SIZE;

    if (offset >= MAX_RESULTS) {
      return {
        results: [],
        pagination: {
          currentPage: page,
          totalPages: Math.floor(MAX_RESULTS / PAGE_SIZE),
          totalCount: 0,
          hasMore: false
        }
      };
    }

    const keywordConditions = cafeQueries.buildKeywordConditions(keywords);
    const filterConditions = this.buildNonDistanceFilters(filters);
    const distanceCalc = cafeQueries.calculateDistance(location.latitude, location.longitude);

    const results = await cafeQueries.getCafesWithKeywords(
      keywordConditions,
      filterConditions,
      distanceCalc,
      filters?.radius || 999999
    );

    const firstResult = results[0];
    const totalCount = firstResult ? Number(firstResult.totalCount) : 0;
    const totalPages = Math.min(
      Math.ceil(totalCount / PAGE_SIZE),
      Math.floor(MAX_RESULTS / PAGE_SIZE)
    );

    return {
      results: results.map((r) => {
        const { ...cafeData } = r;
        return cafeData;
      }),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: Math.min(totalCount, MAX_RESULTS),
        hasMore: page < totalPages
      }
    };
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

  private getMatchingKeywords(cafe: any, keywords: KeywordMatch[]): KeywordMatch[] {
    const matches: KeywordMatch[] = [];

    // Check ambiance keywords
    if (cafe.ambiance) {
      const ambianceKeywords = keywords.filter((k) => k.category === 'ambiance');
      for (const k of ambianceKeywords) {
        if (
          Object.keys(cafe.ambiance).some(
            (a) =>
              a.toLowerCase().includes(k.keyword.toLowerCase()) ||
              k.keyword.toLowerCase().includes(a.toLowerCase())
          )
        ) {
          // Calculate individual match confidence based on cafe's attributes
          const matchConfidence = k.confidence * (cafe.rating / 5.0); // Example: adjust by rating
          matches.push({
            ...k,
            confidence: matchConfidence
          });
        }
      }
    }

    // Check dietary keywords
    if (cafe.dietaryOptions) {
      const dietaryKeywords = keywords.filter((k) => k.category === 'dietary');
      for (const k of dietaryKeywords) {
        if (
          Object.keys(cafe.dietaryOptions).some(
            (d) =>
              d.toLowerCase().includes(k.keyword.toLowerCase()) ||
              k.keyword.toLowerCase().includes(d.toLowerCase())
          )
        ) {
          const matchConfidence = k.confidence * (cafe.rating / 5.0);
          matches.push({
            ...k,
            confidence: matchConfidence
          });
        }
      }
    }

    // Check general keywords
    if (cafe.keywords) {
      const generalKeywords = keywords.filter((k) => k.category === 'general');
      for (const k of generalKeywords) {
        if (
          cafe.keywords.some(
            (ck: string) =>
              ck.toLowerCase().includes(k.keyword.toLowerCase()) ||
              k.keyword.toLowerCase().includes(ck.toLowerCase())
          )
        ) {
          const matchConfidence = k.confidence * (cafe.rating / 5.0);
          matches.push({
            ...k,
            confidence: matchConfidence
          });
        }
      }
    }

    return matches;
  }

  private calculateScore(
    cafe: any,
    keywords: KeywordMatch[],
    userPrefs?: UserPreferences,
    hasSearchQuery: boolean = false
  ): number {
    const searchKeywords = keywords.filter((k) => k.confidence > 1.0);
    const prefKeywords = keywords.filter((k) => k.confidence <= 1.0);

    // Calculate individual scores
    const searchScore =
      searchKeywords.length > 0
        ? this.getMatchingKeywords(cafe, searchKeywords).length / searchKeywords.length
        : 0;

    const prefScore =
      prefKeywords.length > 0
        ? this.getMatchingKeywords(cafe, prefKeywords).length / prefKeywords.length
        : 0;

    const ratingScore = (cafe.rating - 3.5) / 1.5; // Normalize to -1 to 1
    const distanceScore = Math.max(0, 1 - (cafe.distance || 0) / 10); // Normalize to 0-1 within 10km

    // Weights should sum to 1
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

    const finalScore =
      searchScore * weights.search +
      prefScore * weights.preferences +
      ratingScore * weights.rating +
      distanceScore * weights.distance;

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, (finalScore + 1) / 2));
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
        // Get matching keywords with individual scores for this specific cafe
        const matchingKeywords = this.getMatchingKeywords(cafe, keywords).map((keyword) => ({
          ...keyword,
          confidence:
            keyword.confidence *
            // Adjust confidence based on cafe-specific factors
            ((cafe.rating / 5.0) * // Rating factor
              (1 - (cafe.distance || 0) / 20) * // Distance factor (decreases with distance)
              (cafe.reviewCount > 10 ? 1.2 : 1)) // Bonus for well-reviewed cafes
        }));

        const score = this.calculateScore(cafe, matchingKeywords, userPrefs, hasSearchQuery);

        return {
          id: cafe.id,
          name: cafe.name,
          description: cafe.description,
          address: cafe.address,
          distance: Number(cafe.distance),
          matchingKeywords,
          score: Number(score.toFixed(2)),
          metadata: {
            rating: cafe.rating,
            reviewCount: cafe.reviewCount,
            keywords: cafe.keywords,
            location: {
              coordinates: [cafe.location.coordinates[0], cafe.location.coordinates[1]] as [
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
