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
import { cosineSimilarity } from '@utils/math.js';

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

      console.log('Search request:', {
        query: request.query,
        userId: request.userId,
        location,
        filters: request.filters
      });

      const searchKeywords = request.query ? await this.analyzeQueryKeywords(request.query) : [];
      console.log('Analyzed search keywords:', searchKeywords);

      let userPrefs: UserPreferences | undefined;
      let preferenceKeywords: KeywordMatch[] = [];

      if (request.userId) {
        userPrefs = await this.getUserPreferences(request.userId);
        preferenceKeywords = await this.convertPreferencesToKeywords(userPrefs);
        console.log('User preference keywords:', preferenceKeywords);
      }

      const combinedKeywords = [...searchKeywords, ...preferenceKeywords];

      console.log('Combined keywords before semantic analysis:', combinedKeywords);

      if (combinedKeywords.length === 0) {
        console.log('No keywords found, using distance-based ranking');
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
        console.log('Using cached semantic scores');
      } else {
        const prompt = createSemanticAnalysisPrompt(combinedKeywords);
        const response = await this.geminiClient.generateContent(prompt);

        try {
          const responseText = response.text().trim();
          const jsonStart = responseText.indexOf('{');
          const jsonEnd = responseText.lastIndexOf('}') + 1;

          if (jsonStart === -1 || jsonEnd === 0) {
            throw new Error('No valid JSON object found in response');
          }

          const jsonContent = responseText.slice(jsonStart, jsonEnd);
          semanticScores = JSON.parse(jsonContent) as KeywordMatch[];

          if (!Array.isArray(semanticScores)) {
            semanticScores = [semanticScores];
          }

          console.log('Generated new semantic scores:', semanticScores);
          await this.cache.set(cacheKey, semanticScores, CacheConfig.semanticAnalysisTTL);
        } catch (error) {
          console.error('Failed to parse semantic analysis response:', error);
          console.log('Raw response:', response.text());
          semanticScores = combinedKeywords.map((k) => ({
            ...k,
            confidence: k.confidence || 0.5
          }));
        }
      }

      const { results: cafes, pagination } = await this.fetchCafesWithKeywords(
        semanticScores,
        location,
        request.filters,
        page
      );

      console.log('Fetched cafes count:', cafes.length);

      const recommendations = rankAndScoreCafes(
        cafes,
        semanticScores,
        (cafe, kw) => this.getMatchingKeywords(cafe, kw),
        userPrefs,
        !!request.query
      );

      console.log(
        'Final recommendations:',
        recommendations.map((r) => ({
          id: r.id,
          name: r.name,
          matchingKeywords: r.matchingKeywords,
          score: r.score
        }))
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

  private async convertPreferencesToKeywords(prefs: UserPreferences): Promise<KeywordMatch[]> {
    const keywords: KeywordMatch[] = [];

    const historicalPreferences = await this.getUserHistoricalPreferences(prefs.userId);

    for (const category of ['dietary', 'ambiance', 'activities'] as const) {
      prefs.preferences[category]?.forEach((pref) => {
        const importance = this.calculateKeywordImportance(pref, category, historicalPreferences);

        keywords.push({
          keyword: pref,
          confidence: 1.0,
          category: category === 'activities' ? 'activity' : category,
          isNegated: false,
          importance,
          context: {
            isExplicit: true,
            isHistorical: historicalPreferences.has(pref),
            isPriority: this.isPriorityKeyword(pref, category),
            uncertainty: {
              isUncertain: false,
              strength: 1.0
            },
            matchDetails: {
              matchedTerms: [],
              similarityScore: 1.0
            }
          }
        });
      });
    }

    return keywords;
  }

  private async getUserHistoricalPreferences(userId: string): Promise<Set<string>> {
    try {
      const result = await db
        .select({ recentSearches: users.recentSearches })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!result?.[0]?.recentSearches) {
        return new Set();
      }

      const keywords = new Set<string>();
      const searches = result[0].recentSearches;

      for (const search of searches) {
        const extractedKeywords = await this.analyzeQueryKeywords(search.query);
        extractedKeywords.forEach((k) => keywords.add(k.keyword));
      }

      return keywords;
    } catch (error) {
      console.error('Failed to get historical preferences:', error);
      return new Set();
    }
  }

  private calculateKeywordImportance(
    keyword: string,
    category: string,
    historicalPreferences: Set<string>
  ): number {
    let importance = 1.0;

    if (historicalPreferences.has(keyword)) {
      importance += 0.3;
    }

    if (this.isPriorityKeyword(keyword, category)) {
      importance += 0.4;
    }

    return Math.min(2.0, importance);
  }

  private isPriorityKeyword(keyword: string, category: string): boolean {
    const priorityKeywords = {
      dietary: new Set(['vegan', 'gluten-free', 'halal', 'kosher']),
      ambiance: new Set(['quiet', 'cozy', 'family-friendly']),
      activity: new Set(['work', 'study', 'meeting']),
      general: new Set(['coffee', 'wifi', 'parking'])
    };

    return priorityKeywords[category as keyof typeof priorityKeywords]?.has(keyword) || false;
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

    const cafeKeywords = new Set<string>(cafe.keywords || []);
    const cafeAmbiance = Array.isArray(cafe.ambiance)
      ? cafe.ambiance.map((k: string) => k.toLowerCase())
      : [];
    const cafeDietary = Array.isArray(cafe.dietaryOptions)
      ? cafe.dietaryOptions.map((k: string) => k.toLowerCase())
      : [];

    console.log('Processing cafe:', cafe.name, {
      rawAmbiance: cafe.ambiance,
      rawDietary: cafe.dietaryOptions,
      parsedAmbiance: cafeAmbiance,
      parsedDietary: cafeDietary,
      keywords: Array.from(cafeKeywords)
    });

    for (const keyword of keywords) {
      let isMatch = false;
      let matchedTerms: string[] = [];
      const searchTerm = keyword.keyword.toLowerCase();

      const matchStrength = keyword.context?.uncertainty?.isUncertain
        ? Math.max(0.3, keyword.context.uncertainty.strength)
        : 1.0;

      console.log(`Checking keyword "${keyword.keyword}" for cafe ${cafe.name}:`, {
        category: keyword.category,
        isNegated: keyword.isNegated,
        searchTerm
      });

      switch (keyword.category) {
        case 'ambiance':
          isMatch = cafeAmbiance.includes(searchTerm);
          console.log('Ambiance match check:', {
            searchTerm,
            cafeAmbiance,
            isMatch
          });
          break;
        case 'dietary':
          isMatch = cafeDietary.includes(searchTerm);
          console.log('Dietary match check:', {
            searchTerm,
            cafeDietary,
            isMatch
          });
          break;
        case 'activity':
        case 'general':
          isMatch = cafeKeywords.has(searchTerm);
          console.log('Keyword match check:', {
            searchTerm,
            cafeKeywords: Array.from(cafeKeywords),
            isMatch
          });
          break;
      }

      if (keyword.isNegated) {
        if (isMatch) {
          matchedTerms = [keyword.keyword];
          matchedTerms = [keyword.keyword];
          const adjustedConfidence = -1.0 * matchStrength * keyword.importance;

          console.log('Processing negated term:', {
            cafe: cafe.name,
            keyword: keyword.keyword,
            isMatch,
            adjustedConfidence
          });

          matches.push({
            ...keyword,
            confidence: adjustedConfidence,
            context: {
              ...keyword.context,
              uncertainty: {
                ...keyword.context.uncertainty,
                strength: matchStrength
              },
              matchDetails: {
                matchedTerms,
                similarityScore: Math.abs(adjustedConfidence)
              }
            }
          });
        }
      } else if (isMatch) {
        matchedTerms = [keyword.keyword];
        const adjustedConfidence = matchStrength * keyword.importance;

        console.log('Processing regular term:', {
          cafe: cafe.name,
          keyword: keyword.keyword,
          isMatch,
          adjustedConfidence
        });

        matches.push({
          ...keyword,
          confidence: adjustedConfidence,
          context: {
            ...keyword.context,
            uncertainty: {
              ...keyword.context.uncertainty,
              strength: matchStrength
            },
            matchDetails: {
              matchedTerms,
              similarityScore: adjustedConfidence
            }
          }
        });
      }
    }

    console.log('Final matches for cafe:', cafe.name, matches);
    return matches;
  }

  private getKeywordVector(keywords: string[], category: string): number[] {
    const categoryKeywords = {
      ambiance: [
        'cozy',
        'quiet',
        'modern',
        'rustic',
        'vibrant',
        'loud',
        'peaceful',
        'trendy',
        'industrial',
        'casual',
        'lively',
        'minimalist',
        'bright',
        'spacious',
        'traditional',
        'warm',
        'bohemian',
        'eclectic',
        'artsy',
        'elegant',
        'sophisticated',
        'relaxed'
      ],
      dietary: [
        'vegan',
        'vegetarian',
        'gluten-free',
        'halal',
        'kosher',
        'organic',
        'dairy-free',
        'pescatarian',
        'low-carb',
        'keto',
        'paleo',
        'sugar-free',
        'soy-free',
        'egg-free',
        'nut-free',
        'raw'
      ],
      activity: ['work', 'study', 'meeting', 'social', 'date', 'family', 'group', 'private'],
      general: [
        'coffee',
        'tea',
        'wifi',
        'parking',
        'food',
        'dessert',
        'breakfast',
        'lunch',
        'brunch',
        'roastery',
        'bagels',
        'cafe',
        'bistro'
      ]
    };

    const baseVector = categoryKeywords[category as keyof typeof categoryKeywords] || [];
    return baseVector.map((k) =>
      keywords.some((keyword) => keyword.toLowerCase().includes(k.toLowerCase())) ? 1 : 0
    );
  }

  private calculateConfidenceScore(
    cafeKeywords: string[],
    searchKeyword: string,
    category: string
  ): number {
    const cafeVector = this.getKeywordVector(cafeKeywords, category);
    const searchVector = this.getKeywordVector([searchKeyword], category);

    return cosineSimilarity(cafeVector, searchVector);
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
