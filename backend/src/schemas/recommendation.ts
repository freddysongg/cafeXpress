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
  confidence: z.number().min(0).max(1),
  category: z.enum(['ambiance', 'dietary', 'activity', 'general'])
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
  userId: z.string().optional()
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
    source: z.enum(['cache', 'search', 'preferences', 'location'])
  })
});

// Configuration
export const CacheConfig = {
  searchQueryTTL: 15 * 60 * 1000, // 15 minutes for search queries
  preferencesMatchTTL: 30 * 60 * 1000, // 30 minutes for preference matches
  keywordAnalysisTTL: 60 * 60 * 1000, // 1 hour for keyword analysis
  maxSize: 1000
};

export const CacheKeys = {
  searchQuery: (query: string) => `cache:query:${query}`,
  userPreferences: (userId: string) => `cache:preferences:${userId}`,
  keywordAnalysis: (keywords: string[]) => `cache:keywords:${keywords.sort().join(':')}`,
  locationBased: (lat: number, lng: number) => `cache:location:${lat}:${lng}`
};

export const RateLimitConfig = {
  requestsPerSecond: 5,
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
