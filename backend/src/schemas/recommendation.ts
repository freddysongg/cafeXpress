import { z } from 'zod';

// Base recommendation schema
export const baseRecommendation = z.object({
  id: z.string().uuid(),
  cafeId: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  score: z.number().min(0).max(1),
  reason: z.string(),
  confidenceScore: z.number().min(0).max(1),
  metadata: z
    .object({
      name: z.string(),
      description: z.string(),
      tags: z.array(z.string()).optional(),
      sentimentScore: z
        .object({
          positive: z.number().min(0).max(1),
          negative: z.number().min(0).max(1),
          neutral: z.number().min(0).max(1),
          compound: z.number().min(-1).max(1)
        })
        .optional()
    })
    .optional()
});

// Recommendation request schemas
export const personalizedRecommendationRequest = z.object({
  userId: z.string().uuid(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number()
    })
    .optional(),
  preferences: z
    .object({
      dietary: z.array(z.string()).optional(),
      activities: z.array(z.string()).optional(),
      ambiance: z.array(z.string()).optional()
    })
    .optional()
});

export const guestRecommendationRequest = z.object({
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number()
    })
    .optional(),
  trending: z.boolean().optional()
});

export const searchRecommendationRequest = z.object({
  query: z.string().min(3),
  filters: z
    .object({
      location: z
        .object({
          latitude: z.number(),
          longitude: z.number()
        })
        .optional(),
      dietary: z.array(z.string()).optional(),
      activities: z.array(z.string()).optional(),
      ambiance: z.array(z.string()).optional()
    })
    .optional()
});

// Recommendation response schema
export const GeminiResponse = z.object({
  recommendations: z.array(baseRecommendation),
  generatedAt: z.string().datetime(),
  modelVersion: z.string()
});

export interface GeminiClient {
  analyzeText: (text: string) => Promise<{
    score: {
      positive: number;
      negative: number;
      neutral: number;
      compound: number;
    };
    entities: string[];
  }>;
  getModelVersion: () => string;
}

export const recommendationResponse = z.object({
  status: z.enum(['success', 'error']),
  data: z.array(baseRecommendation).optional(),
  message: z.string().optional(),
  metadata: z
    .object({
      generatedAt: z.string().datetime(),
      modelVersion: z.string(),
      cacheHit: z.boolean()
    })
    .optional()
});

// Sentiment analysis schema
export const sentimentAnalysisRequest = z.object({
  reviewIds: z.array(z.string().uuid())
});

export const sentimentAnalysisResponse = z.object({
  status: z.enum(['success', 'error']),
  data: z
    .array(
      z.object({
        reviewId: z.string().uuid(),
        sentimentScore: z.number().min(-1).max(1),
        keywords: z.array(z.string())
      })
    )
    .optional(),
  message: z.string().optional()
});

// Embedding generation schema
export const embeddingGenerationRequest = z.object({
  type: z.enum(['user', 'cafe']),
  ids: z.array(z.string().uuid())
});

export const embeddingGenerationResponse = z.object({
  status: z.enum(['success', 'error']),
  data: z
    .array(
      z.object({
        id: z.string().uuid(),
        embedding: z.array(z.number())
      })
    )
    .optional(),
  message: z.string().optional()
});

// User preferences schema
export const preferencesSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date().optional(),
  userId: z.string().uuid().nullable(),
  favoriteCafes: z.array(z.string().uuid()).nullable(),
  dietaryRestrictions: z.array(z.string()).nullable(),
  ambiance: z.array(z.string()).nullable(),
  semanticEmbedding: z
    .object({
      vector: z.array(z.number()),
      metadata: z.object({
        type: z.enum(['user', 'preferences', 'cafe']),
        id: z.string(),
        createdAt: z.date().optional()
      })
    })
    .nullable()
});

export interface UserWithLocation {
  id: string;
  username: string;
  description: string | null;
  location: Location;
  preferencesEmbedding: z.infer<typeof preferencesSchema>['semanticEmbedding'];
}

export interface Location {
  type: 'Point';
  coordinates: [number, number];
}

export const CACHE_CONFIG = {
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

export const RATE_LIMIT = {
  requestsPerSecond: 5,
  maxRetries: 3,
  initialRetryDelay: 1000,
  backoffFactor: 2,
  embeddingRetries: 5,
  embeddingDelay: 2000
};

export interface SemanticAnalysis {
  matchedKeywords: Array<{
    keyword: string;
    confidence: number;
    relevance: number;
    source: 'description' | 'reviews' | 'metadata';
  }>;
  overallConfidence: number;
  processedText: string;
}

export interface CachedSentiment {
  recommendations: Array<{
    id: string;
    cafeId: string;
    name: string;
    description: string;
    score: number;
    reason: string;
    confidenceScore: number;
    metadata: {
      semanticAnalysis: SemanticAnalysis;
      name: string;
      description: string;
      sentimentScore: {
        positive: number;
        negative: number;
        neutral: number;
        compound: number;
      };
      semanticScore: number;
      tags: string[];
    };
  }>;
  generatedAt: string;
  modelVersion: string;
}

export type PersonalizedRecommendationRequest = z.infer<typeof personalizedRecommendationRequest>;
export type RecommendationResponse = z.infer<typeof recommendationResponse>;
export type BaseRecommendation = z.infer<typeof baseRecommendation>;
export type Preferences = z.infer<typeof preferencesSchema>;
