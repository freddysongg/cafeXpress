import type { FastifyRequest } from 'fastify';
import { db } from '@config/db.js';
import { cafes, reviews } from '@config/schemas.js';
import type { GeminiClient } from '@schemas/gemini.js';
import type { SearchResponse, GeminiResponse, SearchResult, Embedding } from '@schemas/semantic.js';
import { eq, sql, desc } from 'drizzle-orm';
import { RecommendationCache, DEFAULT_CACHE_CONFIG } from '@services/cache.js';

interface SentimentScore {
  positive: number;
  negative: number;
  neutral: number;
  compound: number;
}

interface SentimentResult {
  score: SentimentScore;
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

class InMemoryVectorStore {
  private vectors: { id: string; embedding: Embedding; metadata: any }[] = [];

  async addVectors(vectors: { id: string; embedding: Embedding; metadata: any }[]) {
    this.vectors.push(...vectors);
  }

  async similaritySearchVectorWithScore(queryEmbedding: Embedding, k: number, threshold: number) {
    const results = this.vectors
      .map((vector) => ({
        ...vector,
        score: this.cosineSimilarity(queryEmbedding, vector.embedding)
      }))
      .filter((result) => result.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    return results;
  }

  private cosineSimilarity(embedding1: Embedding, embedding2: Embedding): number {
    if (embedding1.vector.length !== embedding2.vector.length) return 0;

    const dotProduct = embedding1.vector.reduce((sum, a, i) => sum + a * embedding2.vector[i], 0);
    const magnitudeA = Math.sqrt(embedding1.vector.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(embedding2.vector.reduce((sum, b) => sum + b * b, 0));

    return dotProduct / (magnitudeA * magnitudeB);
  }
}

const MAX_RESULTS = 10;
const BATCH_SIZE = 100;
const SIMILARITY_THRESHOLD = 0.7;

export class SemanticSearchService implements ISemanticSearchService {
  private vectorStore: InMemoryVectorStore;
  private cache: RecommendationCache;
  private geminiClient: GeminiClient;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
    this.cache = new RecommendationCache(DEFAULT_CACHE_CONFIG);
    this.vectorStore = new InMemoryVectorStore();
  }

  async generateEmbedding(params: {
    type: 'user' | 'preferences' | 'cafe';
    id: string;
    text: string;
  }): Promise<Embedding> {
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
    if (embedding1.vector.length !== embedding2.vector.length) return 0;

    const dotProduct = embedding1.vector.reduce((sum, a, i) => sum + a * embedding2.vector[i], 0);
    const magnitudeA = Math.sqrt(embedding1.vector.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(embedding2.vector.reduce((sum, b) => sum + b * b, 0));

    return dotProduct / (magnitudeA * magnitudeB);
  }

  async calculateSemanticScore(embedding1: Embedding, embedding2: Embedding): Promise<number> {
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

  async initialize() {
    await this.loadCafeEmbeddings();
    await this.loadReviewSentiments();
  }

  private async loadCafeEmbeddings() {
    const cafesData = await db
      .select({
        id: cafes.id,
        name: cafes.name,
        description: cafes.description,
        semanticEmbedding: cafes.semanticEmbedding
      })
      .from(cafes);

    const embeddings = cafesData
      .filter((cafe) => Array.isArray(cafe.semanticEmbedding))
      .map((cafe) => ({
        id: cafe.id,
        embedding: {
          vector: cafe.semanticEmbedding as number[],
          metadata: {
            type: 'cafe' as const,
            id: cafe.id,
            createdAt: new Date()
          }
        },
        metadata: {
          name: cafe.name,
          description: cafe.description
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
          content: sql<string>`content`
        })
        .from(reviews)
        .limit(BATCH_SIZE)
        .offset(offset);

      const sentimentResponses = await this.geminiClient.batchAnalyzeSentiment(
        batch.map((r) => r.content)
      );
      const sentimentResults: SentimentResult[] = sentimentResponses.map((response) => ({
        score: {
          positive: response.score,
          negative: 1 - response.score,
          neutral: 0,
          compound: response.score * 2 - 1 // Convert 0-1 range to -1 to 1 range
        }
      }));

      await db.transaction(async (tx) => {
        for (let i = 0; i < batch.length; i++) {
          const sentiment = sentimentResults[i];
          await tx
            .update(reviews)
            .set({
              sentimentScore: {
                positive: sentiment.score.positive,
                negative: sentiment.score.negative,
                neutral: sentiment.score.neutral,
                compound: sentiment.score.compound
              }
            })
            .where(sql`id = ${batch[i].id}`);
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
        message: 'Search query must be a string with at least 3 characters'
      };
    }

    try {
      const embeddings = new GeminiEmbeddings(this.geminiClient);

      let sentimentResult: SentimentResult;
      try {
        const sentimentResponse = await this.geminiClient.analyzeSentiment(query);
        sentimentResult = {
          score: {
            positive: sentimentResponse.score,
            negative: 1 - sentimentResponse.score,
            neutral: 0,
            compound: sentimentResponse.score * 2 - 1 // Convert 0-1 range to -1 to 1 range
          }
        };
      } catch (error) {
        console.error('Failed to analyze sentiment:', error);
        sentimentResult = {
          score: {
            positive: 0,
            negative: 0,
            neutral: 1,
            compound: 0
          }
        };
      }
      const sentiment = sentimentResult.score;
      const sentimentType =
        sentiment.compound > 0.5 ? 'positive' : sentiment.compound < -0.5 ? 'negative' : 'neutral';

      const cached =
        (await this.cache.get(`${query}:${sentimentType}`)) || (await this.cache.get(query));
      if (cached) {
        const recommendations = Array.isArray(cached) ? cached : cached.recommendations;

        return {
          status: 'success',
          data: recommendations.map((result) => ({
            id: result.id,
            cafeId: result.cafeId,
            name: result.name,
            description: result.description,
            score: result.score,
            reason: result.reason,
            confidenceScore: result.confidenceScore,
            metadata: result.metadata
          }))
        };
      }

      const [semanticResults, keywordResults] = await Promise.all([
        this.semanticSearch(query, sentiment),
        this.keywordSearch(query, sentiment)
      ]);

      const combinedResults = this.combineResults(semanticResults, keywordResults);

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
      await this.cache.set(query, response);

      return {
        status: 'success',
        data: combinedResults
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error performing search:', err.message);
      return {
        status: 'error',
        message: err.message
      };
    }
  }

  private async semanticSearch(query: string, sentiment: SentimentScore): Promise<SearchResult[]> {
    try {
      const queryWithSentiment = `${query} [${
        sentiment.compound > 0 ? 'positive' : sentiment.compound < 0 ? 'negative' : 'neutral'
      }]`;
      const queryVector = await this.geminiClient.generateEmbedding(queryWithSentiment);
      const queryEmbedding: Embedding = {
        vector: queryVector,
        metadata: {
          type: 'query',
          id: 'query',
          createdAt: new Date()
        }
      };
      const results = await this.vectorStore.similaritySearchVectorWithScore(
        queryEmbedding,
        MAX_RESULTS,
        SIMILARITY_THRESHOLD
      );

      return results.map((result) => ({
        id: result.id,
        cafeId: result.id,
        name: result.metadata?.name || '',
        description: result.metadata?.description || '',
        score: result.score,
        reason: 'Semantic match',
        confidenceScore: result.score,
        metadata: {
          name: result.metadata?.name || '',
          description: result.metadata?.description || ''
        }
      }));
    } catch (error) {
      console.error('Error in semantic search:', error);
      return [];
    }
  }

  private async keywordSearch(query: string, sentiment: SentimentScore): Promise<SearchResult[]> {
    const results = await db
      .select({
        id: cafes.id,
        name: cafes.name,
        address: cafes.address,
        city: cafes.city,
        state: cafes.state,
        description: cafes.description,
        sentimentScore: sql<SentimentScore>`coalesce(jsonb_build_object(
          'positive', avg((${reviews.sentimentScore}->>'positive')::numeric),
          'negative', avg((${reviews.sentimentScore}->>'negative')::numeric),
          'neutral', avg((${reviews.sentimentScore}->>'neutral')::numeric),
          'compound', avg((${reviews.sentimentScore}->>'compound')::numeric)
        ), '{"positive":0,"negative":0,"neutral":0,"compound":0}'::jsonb)`,
        score: sql<number>`ts_rank(to_tsvector(${cafes.name} || ' ' || ${cafes.description}), plainto_tsquery(${query}))`
      })
      .from(cafes)
      .leftJoin(reviews, eq(reviews.cafeId, cafes.id))
      .where(
        sql`to_tsvector(${cafes.name} || ' ' || ${cafes.description}) @@ plainto_tsquery(${query})`
      )
      .groupBy(cafes.id)
      .orderBy(desc(sql`score`))
      .limit(MAX_RESULTS);

    return results.map((result) => {
      const sentimentScore = result.sentimentScore.compound;
      const sentimentAlignment = 1 - Math.abs(sentimentScore - sentiment.compound);
      const adjustedScore = Number(result.score) * (0.5 + 0.5 * sentimentAlignment);

      return {
        ...result,
        cafeId: result.id,
        reason: 'Keyword match',
        confidenceScore: adjustedScore,
        description: result.description || '',
        metadata: {
          name: result.name,
          description: result.description || '',
          sentimentAlignment
        }
      };
    });
  }

  private combineResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[]
  ): SearchResult[] {
    const resultsMap = new Map<string, SearchResult>();

    semanticResults.forEach((result) => {
      resultsMap.set(result.id, {
        ...result,
        name: result.metadata?.name || result.name,
        description: result.metadata?.description || result.description,
        metadata: {
          name: result.metadata?.name || result.name,
          description: result.metadata?.description || result.description
        }
      });
    });

    keywordResults.forEach((result) => {
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

class GeminiEmbeddings {
  private geminiClient: GeminiClient;

  constructor(geminiClient: GeminiClient) {
    this.geminiClient = geminiClient;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.geminiClient.generateEmbedding(text)));
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.geminiClient.generateEmbedding(text);
  }
}
