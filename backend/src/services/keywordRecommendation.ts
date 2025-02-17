import { db } from '@config/db.js';
import { cafes, users } from '@config/schemas.js';
import { eq, sql } from 'drizzle-orm';
import type { GeminiClient } from '@schemas/gemini.js';
import { RecommendationCache } from '@services/cache.js';
import {
  CacheConfig,
  RateLimitConfig,
  DEFAULT_LOCATION,
  CacheKeys,
  type SearchRequest,
  type KeywordMatch,
  type RecommendationResponse,
  type UserPreferences,
  FetchCafesResult
} from '@schemas/recommendation.js';
import * as cafeQueries from '@services/queries/cafeQueries.js';
import { rankByDistance, rankAndScoreCafes } from '@utils/scoring.js';
import { createSemanticAnalysisPrompt, createKeywordAnalysisPrompt } from '@utils/prompt.js';

/**
 * Service for generating cafe recommendations based on keywords and user preferences.
 * Handles three main recommendation scenarios:
 * 1. Search-based: Uses user input query to find relevant cafes
 * 2. Preference-based: Uses user preferences when logged in
 * 3. Location-based: Falls back to distance-based recommendations
 */
class KeywordRecommendationService {
  private cache: RecommendationCache;
  private geminiClient: GeminiClient;
  private lastRequestTime: number = 0;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
    this.cache = new RecommendationCache(CacheConfig);
  }

  /**
   * Main method to get cafe recommendations based on search request.
   * Processes user input, preferences, and location to generate relevant recommendations.
   *
   * @param request - Search parameters including query, location, and user info
   * @returns Promise containing recommendation response with cafe data and metadata
   */
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

      if (searchKeywords.length === 0) {
        const { results: cafes, pagination } = await this.fetchCafesWithKeywords(
          [],
          location,
          request.filters,
          page
        );

        const recommendations = rankByDistance(cafes);

        return this.createSuccessResponse(recommendations, pagination, 'location');
      }

      const cacheKey = CacheKeys.semanticAnalysis(combinedKeywords, request.userId);
      const cachedScores = await this.cache.get<KeywordMatch[]>(cacheKey);

      let semanticScores: KeywordMatch[];

      if (cachedScores) {
        semanticScores = cachedScores;
      } else {
        const prompt = createSemanticAnalysisPrompt(combinedKeywords);
        const response = await this.geminiClient.generateContent(prompt);

        console.log('Raw response from Gemini:', response.text());

        const responseText = response
          .text()
          .trim()
          .replace(/```json\n|\n```|```/g, '');

        semanticScores = JSON.parse(responseText) as KeywordMatch[];

        await this.cache.set(cacheKey, semanticScores, CacheConfig.semanticAnalysisTTL);
      }

      const { results: cafes, pagination } = await this.fetchCafesWithKeywords(
        semanticScores,
        location,
        request.filters,
        page
      );

      const recommendations = rankAndScoreCafes(
        cafes,
        semanticScores,
        this.getMatchingKeywords.bind(this),
        userPrefs,
        searchKeywords.length > 0
      );

      return this.createSuccessResponse(
        recommendations,
        pagination,
        request.query ? 'search' : request.userId ? 'preferences' : 'location'
      );
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return this.createErrorResponse();
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

    const prompt = createKeywordAnalysisPrompt(query);

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

  /**
   * Matches keywords against cafe attributes including ambiance, dietary options, and general keywords.
   * Applies confidence scoring based on match type and category.
   *
   * @param cafe - The cafe object to match keywords against
   * @param keywords - The array of keywords to match
   * @returns An array of matching keywords
   */
  private getMatchingKeywords(cafe: any, keywords: KeywordMatch[]): KeywordMatch[] {
    const matches: KeywordMatch[] = [];

    if (cafe.ambiance) {
      const ambianceKeywords = keywords.filter((k) => k.category === 'ambiance');
      ambianceKeywords.forEach((k) => {
        if (cafe.ambiance.includes(k.keyword)) {
          matches.push({
            ...k,
            confidence: k.confidence
          });
        }
      });
    }

    if (cafe.dietaryOptions) {
      const dietaryKeywords = keywords.filter((k) => k.category === 'dietary');
      dietaryKeywords.forEach((k) => {
        if (cafe.dietaryOptions.includes(k.keyword)) {
          matches.push({
            ...k,
            confidence: k.confidence
          });
        }
      });
    }

    if (cafe.keywords) {
      const generalKeywords = keywords.filter((k) => k.category === 'general');
      generalKeywords.forEach((k) => {
        if (cafe.keywords.includes(k.keyword)) {
          matches.push({
            ...k,
            confidence: k.confidence
          });
        }
      });
    }

    return matches;
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

  /**
   * Creates a success response for the recommendations.
   *
   * @param data - The array of cafe recommendations
   * @param pagination - Pagination metadata
   * @param source - The source of the recommendations (location, cache, search, preferences)
   * @returns A structured response object containing the status and data
   */
  private createSuccessResponse(
    data: any[],
    pagination: any,
    source: 'location' | 'cache' | 'search' | 'preferences'
  ): RecommendationResponse {
    return {
      status: 'success',
      data,
      metadata: {
        total: pagination.totalCount,
        cached: false,
        generatedAt: new Date().toISOString(),
        source,
        pagination: {
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages,
          hasMore: pagination.hasMore
        }
      }
    };
  }

  /**
   * Creates an error response for the recommendations.
   *
   * @returns A structured error response object
   */
  private createErrorResponse(): RecommendationResponse {
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

export default KeywordRecommendationService;
