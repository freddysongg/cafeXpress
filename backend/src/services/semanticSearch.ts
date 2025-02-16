import type { FastifyRequest } from 'fastify';
import { db } from '@config/db.js';
import { cafes, reviews } from '@config/schemas.js';
import type { GeminiClient } from '@schemas/gemini.js';
import type {
  SearchResponse,
  SearchResult,
  Embedding,
  SentimentScore,
  SentimentResult,
  ISemanticSearchService
} from '@schemas/semantic.js';
import type { GeminiResponse } from '@schemas/gemini.js';
import { eq, sql, desc } from 'drizzle-orm';
import { RecommendationCache } from '@services/cache.js';
import { DEFAULT_CACHE_CONFIG } from '@schemas/cache.js';
import { cosineSimilarity } from '@utils/math.js';

class InMemoryVectorStore {
  private vectors: { id: string; embedding: Embedding; metadata: any }[] = [];

  async addVectors(vectors: { id: string; embedding: Embedding; metadata: any }[]) {
    this.vectors.push(...vectors);
  }

  async similaritySearchVectorWithScore(queryEmbedding: Embedding, k: number, threshold: number) {
    const results = this.vectors
      .map((vector) => ({
        ...vector,
        score: cosineSimilarity(queryEmbedding.vector, vector.embedding.vector)
      }))
      .filter((result: { score: number }) => result.score >= threshold)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, k);

    return results;
  }
}

function getDefaultSentimentScore(): SentimentResult {
  return {
    score: {
      positive: 0.5,
      negative: 0.5,
      neutral: 0,
      compound: 0
    }
  };
}

function getSentimentType(compound: number): string {
  if (compound >= 0.05) return 'positive';
  if (compound <= -0.05) return 'negative';
  return 'neutral';
}

function handleSearchError(error: unknown): SearchResponse {
  console.error('Search error:', error);
  return {
    status: 'error',
    message: 'An error occurred during search'
  };
}

// Constants
const MAX_RESULTS = 10;
const BATCH_SIZE = 100;
const SIMILARITY_THRESHOLD = 0.7;

export class SemanticSearchService implements ISemanticSearchService {
  private vectorStore: InMemoryVectorStore;
  private cache: RecommendationCache;
  private geminiClient: GeminiClient;
  private initialized: boolean = false;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
    this.cache = new RecommendationCache(DEFAULT_CACHE_CONFIG);
    this.vectorStore = new InMemoryVectorStore();
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await Promise.all([this.loadCafeEmbeddings(), this.loadReviewSentiments()]);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize SemanticSearchService:', error);
      throw new Error('Failed to initialize semantic search service');
    }
  }

  async generateEmbedding(params: {
    type: 'user' | 'preferences' | 'cafe';
    id: string;
    text: string;
  }): Promise<Embedding> {
    if (!this.initialized) {
      throw new Error('SemanticSearchService not initialized');
    }

    const vector = await this.geminiClient.generateEmbedding(params.text);
    return {
      vector,
      metadata: {
        type: params.type,
        id: params.id,
        createdAt: new Date()
      }
    };
  }

  async calculateSimilarity(embedding1: Embedding, embedding2: Embedding): Promise<number> {
    if (!this.initialized) {
      throw new Error('SemanticSearchService not initialized');
    }

    return cosineSimilarity(embedding1.vector, embedding2.vector);
  }

  async calculateSemanticScore(embedding1: Embedding, embedding2: Embedding): Promise<number> {
    if (!this.initialized) {
      throw new Error('SemanticSearchService not initialized');
    }

    const baseSimilarity = await this.calculateSimilarity(embedding1, embedding2);
    const typeWeights = {
      user: 1.2,
      preferences: 1.5,
      cafe: 1.0,
      query: 1.3
    };

    const type1 = embedding1.metadata.type;
    const type2 = embedding2.metadata.type;
    const weight =
      type1 === type2 ? typeWeights[type1] : Math.max(typeWeights[type1], typeWeights[type2]);

    const createdAt1 = embedding1.metadata.createdAt;
    const createdAt2 = embedding2.metadata.createdAt;

    if (!createdAt1 || !createdAt2) {
      return baseSimilarity * weight;
    }

    const age1 = Date.now() - new Date(createdAt1).getTime();
    const age2 = Date.now() - new Date(createdAt2).getTime();
    const recencyBonus = Math.max(0, 1 - Math.min(age1, age2) / (1000 * 60 * 60 * 24 * 7));

    return baseSimilarity * weight * (1 + recencyBonus * 0.2);
  }

  private async loadCafeEmbeddings() {
    const cafesData = await db
      .select({
        id: cafes.id,
        name: cafes.name,
        description: cafes.description,
        keywords: cafes.keywords,
        semanticEmbedding: cafes.semanticEmbedding,
        dietaryOptions: cafes.dietaryOptions,
        ambiance: cafes.ambiance
      })
      .from(cafes);

    const embeddings = cafesData
      .filter(
        (cafe) => cafe.semanticEmbedding !== null && Array.isArray(cafe.semanticEmbedding?.vector)
      )
      .map((cafe) => ({
        id: cafe.id,
        embedding: {
          vector: cafe.semanticEmbedding!.vector,
          metadata: {
            type: 'cafe' as const,
            id: cafe.id,
            keywords: cafe.keywords || [],
            createdAt: new Date()
          }
        },
        metadata: {
          name: cafe.name,
          description: cafe.description,
          dietaryOptions: cafe.dietaryOptions,
          ambiance: cafe.ambiance
        }
      }));

    await this.vectorStore.addVectors(embeddings);
  }

  private async loadReviewSentiments() {
    const totalReviewsResult = await db.select({ count: sql<number>`count(*)` }).from(reviews);
    const totalReviews = Number(totalReviewsResult[0].count);

    for (let offset = 0; offset < totalReviews; offset += BATCH_SIZE) {
      const batch = await db
        .select({
          id: reviews.id,
          title: reviews.title,
          description: reviews.description
        })
        .from(reviews)
        .limit(BATCH_SIZE)
        .offset(offset);

      const sentimentResponses = await this.geminiClient.batchAnalyzeSentiment(
        batch.map((r) => `${r.title}${r.description ? `: ${r.description}` : ''}`)
      );

      const sentimentResults: SentimentResult[] = sentimentResponses.map((response) => ({
        score: {
          positive: response.score,
          negative: 1 - response.score,
          neutral: 0,
          compound: response.score * 2 - 1
        }
      }));

      await db.transaction(async (tx) => {
        for (let i = 0; i < batch.length; i++) {
          const sentiment = sentimentResults[i];
          await tx
            .update(reviews)
            .set({
              sentimentScore: sql`${JSON.stringify(sentiment.score)}`,
              processedAt: sql`CURRENT_TIMESTAMP`
            })
            .where(eq(reviews.id, batch[i].id));
        }
      });
    }
  }

  async searchCafes(
    req: FastifyRequest<{ Querystring: { query: string } }>
  ): Promise<SearchResponse> {
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return {
        status: 'error',
        message: 'Search query must be at least 3 characters'
      };
    }

    try {
      let sentimentResult: SentimentResult;

      try {
        const sentimentResponse = await this.geminiClient.analyzeSentiment(query);
        sentimentResult = {
          score: {
            positive: sentimentResponse.score,
            negative: 1 - sentimentResponse.score,
            neutral: 0,
            compound: sentimentResponse.score * 2 - 1
          }
        };
      } catch (error) {
        console.error('Failed to analyze sentiment:', error);
        sentimentResult = getDefaultSentimentScore();
      }

      const sentimentScore = sentimentResult.score;
      const sentimentType = getSentimentType(sentimentScore.compound);

      const cached = await this.getCachedResults(query, sentimentType);
      if (cached) return cached;

      const semanticResults = await this.getSemanticResults(query, sentimentResult);
      const sentimentResults = await this.getSentimentResults(query, sentimentResult);

      return this.combineAndCacheResults(semanticResults, sentimentResults, sentimentScore, query);
    } catch (error) {
      return handleSearchError(error);
    }
  }

  private async getCachedResults(
    query: string,
    sentimentType: string
  ): Promise<SearchResponse | null> {
    const cached = await this.cache.get(`${query}:${sentimentType}`);
    if (cached) {
      const recommendations = Array.isArray(cached)
        ? cached
        : (cached as GeminiResponse).recommendations;

      return {
        status: 'success',
        data: recommendations.map(
          (result: {
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
            };
          }) => ({
            id: result.id,
            cafeId: result.cafeId,
            name: result.name,
            description: result.description,
            score: result.score,
            reason: result.reason,
            confidenceScore: result.confidenceScore,
            metadata: result.metadata
          })
        )
      };
    }
    return null;
  }

  private async getSemanticResults(
    query: string,
    sentimentResult: SentimentResult
  ): Promise<SearchResult[]> {
    try {
      const queryWithSentiment = `${query} [${getSentimentType(sentimentResult.score.compound)}]`;
      const semanticVector = await this.geminiClient.generateEmbedding(queryWithSentiment);
      const queryEmbedding: Embedding = {
        vector: semanticVector,
        metadata: {
          type: 'query',
          id: 'query',
          createdAt: new Date()
        }
      };

      const semanticMatches = await this.vectorStore.similaritySearchVectorWithScore(
        queryEmbedding,
        MAX_RESULTS,
        SIMILARITY_THRESHOLD
      );

      return semanticMatches.map((match) => ({
        id: match.id,
        cafeId: match.id,
        name: match.metadata?.name || '',
        description: match.metadata?.description || '',
        score: match.score,
        reason: 'Semantic match',
        confidenceScore: match.score,
        metadata: {
          name: match.metadata?.name || '',
          description: match.metadata?.description || ''
        }
      }));
    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }

  private async getSentimentResults(
    query: string,
    sentimentResult: SentimentResult
  ): Promise<SearchResult[]> {
    const results = await db
      .select({
        id: cafes.id,
        name: cafes.name,
        address: cafes.address,
        city: cafes.city,
        state: cafes.state,
        description: cafes.description,
        dietaryOptions: cafes.dietaryOptions,
        ambiance: cafes.ambiance,
        keywords: cafes.keywords,
        sentimentScore: sql<SentimentScore>`coalesce(jsonb_build_object(
          'positive', avg((${reviews.sentimentScore}->>'positive')::numeric),
          'negative', avg((${reviews.sentimentScore}->>'negative')::numeric),
          'neutral', avg((${reviews.sentimentScore}->>'neutral')::numeric),
          'compound', avg((${reviews.sentimentScore}->>'compound')::numeric)
        ), '{"positive":0,"negative":0,"neutral":0,"compound":0}'::jsonb)`,
        score: sql<number>`ts_rank(
          to_tsvector('english', ${cafes.name} || ' ' || coalesce(${cafes.description}, '') || ' ' || 
          coalesce(array_to_string(${cafes.keywords}, ' '), '')), 
          plainto_tsquery('english', ${query})
        )`
      })
      .from(cafes)
      .leftJoin(reviews, eq(reviews.cafeId, cafes.id))
      .where(
        sql`to_tsvector('english', ${cafes.name} || ' ' || coalesce(${cafes.description}, '') || ' ' || 
        coalesce(array_to_string(${cafes.keywords}, ' '), '')) @@ plainto_tsquery('english', ${query})`
      )
      .groupBy(cafes.id)
      .orderBy(desc(sql`score`))
      .limit(MAX_RESULTS);

    return results.map((result) => {
      const sentimentScore = result.sentimentScore.compound;
      const sentimentAlignment = 1 - Math.abs(sentimentScore - sentimentResult.score.compound);
      const adjustedScore = Number(result.score) * (0.5 + 0.5 * sentimentAlignment);

      return {
        ...result,
        cafeId: result.id,
        reason: 'Keyword and sentiment match',
        confidenceScore: adjustedScore,
        description: result.description || '',
        metadata: {
          name: result.name,
          description: result.description || '',
          dietaryOptions: result.dietaryOptions,
          ambiance: result.ambiance,
          keywords: result.keywords,
          sentimentAlignment
        }
      };
    });
  }

  private async combineAndCacheResults(
    semanticResults: SearchResult[],
    sentimentResults: SearchResult[],
    sentiment: SentimentScore,
    query: string
  ): Promise<SearchResponse> {
    const combinedResults = this.combineResults(semanticResults, sentimentResults);

    const response: GeminiResponse = {
      recommendations: combinedResults.map((result) => ({
        id: result.id,
        cafeId: result.cafeId,
        name: result.name,
        description: result.description,
        score: result.score,
        reason: result.reason,
        confidenceScore: result.confidenceScore,
        metadata: result.metadata
      })),
      generatedAt: new Date().toISOString(),
      modelVersion: '1.0.0'
    };
    this.cache.set(query, response);

    return {
      status: 'success',
      data: combinedResults
    };
  }

  private combineResults(
    semanticResults: SearchResult[],
    sentimentResults: SearchResult[]
  ): SearchResult[] {
    const resultsMap = new Map<string, SearchResult>();

    semanticResults.forEach((result) => {
      resultsMap.set(result.id, {
        ...result,
        score: result.score
      });
    });

    sentimentResults.forEach((result) => {
      const existing = resultsMap.get(result.id);
      if (existing) {
        existing.score = (existing.score + result.score) / 2;
      } else {
        resultsMap.set(result.id, result);
      }
    });

    return Array.from(resultsMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
  }
}
