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
      sentimentScore: z.number().min(-1).max(1).optional()
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
    sentiment: 'positive' | 'neutral' | 'negative';
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

export interface UserWithLocation {
  id: string;
  username: string;
  description: string | null;
  location: Location;
}

export interface Location {
  type: 'Point';
  coordinates: [number, number];
}

export type PersonalizedRecommendationRequest = z.infer<typeof personalizedRecommendationRequest>;
export type RecommendationResponse = z.infer<typeof recommendationResponse>;
export type BaseRecommendation = z.infer<typeof baseRecommendation>;
