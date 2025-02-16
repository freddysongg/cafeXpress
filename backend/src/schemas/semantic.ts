import { FastifyRequest } from 'fastify';
import { z } from 'zod';

export type Embedding = {
  vector: number[];
  metadata: {
    type: 'user' | 'preferences' | 'cafe' | 'query';
    id: string;
    createdAt?: Date;
  };
};

export const EmbeddingSchema = z.object({
  version: z.string().default('1.0'),
  vector: z.array(z.number()),
  metadata: z.object({
    type: z.enum(['user', 'preferences', 'cafe']),
    id: z.string(),
    createdAt: z.date().optional()
  })
});

export type GenerateEmbeddingRequest = {
  type: 'user' | 'preferences' | 'cafe';
  userId?: string;
  cafeId?: string;
  text: string;
};

export type CalculateSimilarityRequest = {
  embedding1: Embedding;
  embedding2: Embedding;
};

export const SentimentSchema = z.object({
  positive: z.number(),
  negative: z.number(),
  neutral: z.number(),
  compound: z.number()
});
export type Sentiment = z.infer<typeof SentimentSchema>;

export const EntitySchema = z.object({
  name: z.string(),
  type: z.string(),
  salience: z.number()
});

export const ReviewAnalysisSchema = z.object({
  id: z.string(),
  text: z.string(),
  content: z.string(),
  description: z.string().optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  sentimentScore: z.object({
    positive: z.number(),
    negative: z.number(),
    neutral: z.number(),
    compound: z.number()
  }),
  entities: z.array(EntitySchema).optional()
});

export type ReviewAnalysis = z.infer<typeof ReviewAnalysisSchema>;

export const LocationSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()])
});
export type Location = z.infer<typeof LocationSchema>;

export const UserPreferencesSchema = z.object({
  userId: z.string(),
  favoriteCafes: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  preferredCuisines: z.array(z.string()).optional(),
  priceRange: z.tuple([z.number(), z.number()]).optional(),
  semanticEmbedding: z.string().optional()
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const CafeRecommendationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  address: z.string(),
  rating: z.number(),
  distance: z.number().optional(),
  semanticEmbedding: z.string().optional(),
  reviewCount: z.number(),
  lastReviewDate: z.string().optional()
});
export type CafeRecommendation = z.infer<typeof CafeRecommendationSchema>;

export const RecommendationMetadataSchema = z.object({
  generatedAt: z.string(),
  modelVersion: z.string(),
  cacheHit: z.boolean()
});

export const RecommendationResponseSchema = z.object({
  status: z.enum(['success', 'error']),
  data: z.array(CafeRecommendationSchema),
  metadata: RecommendationMetadataSchema,
  message: z.string().optional(),
  error: z.string().optional()
});
export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;

export const PersonalizedRecommendationRequestSchema = z.object({
  userId: z.string(),
  location: LocationSchema.optional()
});
export type PersonalizedRecommendationRequest = z.infer<
  typeof PersonalizedRecommendationRequestSchema
>;

export interface SearchResponse {
  status: 'success' | 'error';
  data?: SearchResult[];
  message?: string;
}

export interface GeminiResponse {
  recommendations: SearchResult[];
  generatedAt: string;
  modelVersion: string;
}

export interface SearchResult {
  id: string;
  cafeId: string;
  name: string;
  description: string;
  score: number;
  reason: string;
  confidenceScore: number;
  metadata: {
    name: string;
    description: string;
    [key: string]: any;
  };
}

export interface Embeddings {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export type SemanticSearchService = {
  initialize: () => Promise<void>;
  generateEmbedding: (request: GenerateEmbeddingRequest) => Promise<Embedding>;
  calculateSimilarity: (request: CalculateSimilarityRequest) => Promise<number>;
  calculateSemanticScore: (embedding1: Embedding, embedding2: Embedding) => Promise<number>;
};

export interface SentimentScore {
  positive: number;
  negative: number;
  neutral: number;
  compound: number;
}

export interface SentimentResult {
  score: SentimentScore;
  matchedSentimentKeywords?: string[];
}

export interface ISemanticSearchService {
  initialize(): Promise<void>;
  generateEmbedding(params: {
    type: 'user' | 'preferences' | 'cafe';
    id: string;
    text: string;
  }): Promise<Embedding>;
  calculateSimilarity(embedding1: Embedding, embedding2: Embedding): Promise<number>;
  calculateSemanticScore(embedding1: Embedding, embedding2: Embedding): Promise<number>;
  searchCafes(req: FastifyRequest<{ Querystring: { query: string } }>): Promise<SearchResponse>;
}
