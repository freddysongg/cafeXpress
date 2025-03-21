import { z } from 'zod';

// Core schemas
export const LocationSchema = z.object({
  coordinates: z.tuple([z.number(), z.number()]),
  type: z.literal('Point').optional()
});

export const UserPreferencesSchema = z.object({
  userId: z.string(),
  preferences: z.object({
    dietary: z.array(z.string()),
    ambiance: z.array(z.string()),
    activities: z.array(z.string())
  }),
  favoriteCafes: z.array(z.string()).optional()
});

export const KeywordMatchSchema = z.object({
  keyword: z.string(),
  confidence: z.number().min(-1).max(1),
  category: z.enum(['ambiance', 'dietary', 'activity', 'general']),
  isNegated: z.boolean().default(false),
  importance: z.number().min(0).max(2).default(1),
  context: z
    .object({
      isExplicit: z.boolean().default(false),
      isHistorical: z.boolean().default(false),
      isPriority: z.boolean().default(false),
      grammarGroup: z.string().optional(),
      uncertainty: z
        .object({
          isUncertain: z.boolean().default(false),
          modifier: z.string().optional(),
          strength: z.number().min(0).max(1).default(1)
        })
        .default({}),
      matchDetails: z
        .object({
          matchedTerms: z.array(z.string()).default([]),
          similarityScore: z.number().min(0).max(1).default(0)
        })
        .default({})
    })
    .default({})
});

// Request schema
export const SearchRequestSchema = z.object({
  query: z.string().optional(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number()
    })
    .optional(),
  filters: z
    .object({
      dietary: z.array(z.string()).optional(),
      ambiance: z.array(z.string()).optional(),
      activities: z.array(z.string()).optional(),
      radius: z.number().optional()
    })
    .optional(),
  userId: z.string().optional(),
  page: z.number().optional()
});

// Response schema
export const CafeRecommendationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  address: z.string(),
  matchingKeywords: z.array(KeywordMatchSchema),
  score: z.number().min(0).max(1),
  distance: z.number().optional(),
  metadata: z.object({
    rating: z.number(),
    reviewCount: z.number(),
    keywords: z.array(z.string()),
    location: LocationSchema,
    photos: z.array(z.string()).optional()
  })
});

export const RecommendationResponseSchema = z.object({
  status: z.enum(['success', 'error']),
  data: z.array(CafeRecommendationSchema),
  metadata: z.object({
    total: z.number(),
    cached: z.boolean(),
    generatedAt: z.string(),
    expiresAt: z.string().optional(),
    source: z.enum(['cache', 'search', 'preferences', 'location']),
    pagination: z.object({
      currentPage: z.number(),
      totalPages: z.number(),
      hasMore: z.boolean()
    })
  })
});

// Configuration
export const CacheConfig = {
  searchQueryTTL: 15 * 60 * 1000, // 15 minutes for search queries
  preferencesMatchTTL: 30 * 60 * 1000, // 30 minutes for preference matches
  keywordAnalysisTTL: 60 * 60 * 1000, // 1 hour for keyword analysis
  semanticAnalysisTTL: 3600, // Add this line with an appropriate value
  maxSize: 1000
};

export const CacheKeys = {
  searchQuery: (query: string) => `searchQuery:${query}`,
  userPreferences: (userId: string) => `userPreferences:${userId}`,
  keywordAnalysis: (keywords: string[]) => `keywordAnalysis:${keywords.join(',')}`,
  locationBased: (lat: number, lng: number) => `location:${lat},${lng}`,
  semanticAnalysis: (keywords: KeywordMatch[], userId?: string) =>
    `semanticAnalysis:${keywords.map((k) => k.keyword).join(',')}:${userId || 'guest'}`
};

export const RateLimitConfig = {
  requestsPerSecond: 10,
  maxRetries: 3,
  retryDelay: 1000
};

export const DEFAULT_LOCATION = {
  coordinates: [-117.3755, 33.9806] as [number, number],
  type: 'Point' as const
};

// Types
export type Location = z.infer<typeof LocationSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type CafeRecommendation = z.infer<typeof CafeRecommendationSchema>;
export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;
export type KeywordMatch = z.infer<typeof KeywordMatchSchema>;

export interface RecommendationMetadata {
  total: number;
  cached: boolean;
  generatedAt: string;
  source: 'preferences' | 'location' | 'cache' | 'search';
  expiresAt?: string;
  pagination: {
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface FetchCafesResult {
  results: Array<{
    id: string;
    name: string;
    description: string | null;
    address: string;
    keywords: string[] | null;
    ambiance: Record<string, boolean> | null;
    dietaryOptions: Record<string, boolean> | null;
    location: any;
    photos: string[] | null;
    rating: number;
    reviewCount: number;
    distance: number;
    matchScore: number;
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
  };
}
