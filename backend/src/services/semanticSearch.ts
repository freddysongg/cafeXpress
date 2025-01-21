import { FastifyRequest } from 'fastify';
import { db } from '@config/db.js';
import { cafes, reviews } from '@config/schemas.js';
import { eq, sql, desc } from 'drizzle-orm';
import { RecommendationCache, DEFAULT_CACHE_CONFIG } from '@services/cache.js';
import { SearchResponse, GeminiResponse, SearchResult, Embeddings } from '@schemas/semantic';

class InMemoryVectorStore {
  private vectors: { id: string; embedding: number[]; metadata: any }[] = [];

  async addVectors(vectors: { id: string; embedding: number[]; metadata: any }[]) {
    this.vectors.push(...vectors);
  }

  async similaritySearchVectorWithScore(queryEmbedding: number[], k: number, threshold: number) {
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

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    return dotProduct / (magnitudeA * magnitudeB);
  }
}

const MAX_RESULTS = 10;
// const CACHE_TTL = 3600; // 1 hour
const BATCH_SIZE = 100;
const SIMILARITY_THRESHOLD = 0.7;

export class SemanticSearchService {
  private vectorStore: InMemoryVectorStore;
  private cache: RecommendationCache;
  private geminiClient: any;

  constructor(geminiClient: any) {
    this.geminiClient = geminiClient;
    this.cache = new RecommendationCache(DEFAULT_CACHE_CONFIG);
    this.vectorStore = new InMemoryVectorStore();
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
        embedding: cafe.semanticEmbedding as number[],
        metadata: {
          name: cafe.name,
          description: cafe.description
        }
      }));

    await this.vectorStore.addVectors(embeddings);
  }

  private async loadReviewSentiments() {
    // Batch process reviews for sentiment analysis
    const totalReviewsResult = await db.select({ count: sql<number>`count(*)` }).from(reviews);
    const totalReviews = totalReviewsResult[0].count;

    for (let offset = 0; offset < totalReviews; offset += BATCH_SIZE) {
      const batch = await db
        .select({
          id: reviews.id,
          description: reviews.description
        })
        .from(reviews)
        .limit(BATCH_SIZE)
        .offset(offset);

      const sentiments = await this.geminiClient.batchAnalyzeSentiment(
        batch.map((r) => r.description)
      );

      // Store sentiments in database
      await db.transaction(async (tx) => {
        for (let i = 0; i < batch.length; i++) {
          await tx
            .update(reviews)
            .set({ sentimentScore: sentiments[i].score })
            .where(eq(reviews.id, batch[i].id));
        }
      });
    }
  }

  async searchCafes(
    req: FastifyRequest<{ Querystring: { query: string } }>
  ): Promise<SearchResponse> {
    try {
      const { query } = req.query;

      if (!query || query.trim().length < 3) {
        return {
          status: 'error',
          message: 'Search query must be at least 3 characters'
        };
      }

      // Check cache first
      const cached = await this.cache.get(query);
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

      // Hybrid search combining semantic and keyword matching
      const [semanticResults, keywordResults] = await Promise.all([
        this.semanticSearch(query),
        this.keywordSearch(query)
      ]);

      // Combine and deduplicate results
      const combinedResults = this.combineResults(semanticResults, keywordResults);

      // Cache results as GeminiResponse
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

  private async semanticSearch(query: string): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await this.geminiClient.generateEmbedding(query);
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

  private async keywordSearch(query: string): Promise<SearchResult[]> {
    const results = await db
      .select({
        id: cafes.id,
        name: cafes.name,
        address: cafes.address,
        city: cafes.city,
        state: cafes.state,
        description: cafes.description,
        score: sql<number>`ts_rank(to_tsvector(${cafes.name} || ' ' || ${cafes.description}), plainto_tsquery(${query}))`
      })
      .from(cafes)
      .where(
        sql`to_tsvector(${cafes.name} || ' ' || ${cafes.description}) @@ plainto_tsquery(${query})`
      )
      .orderBy(desc(sql`score`))
      .limit(MAX_RESULTS);

    return results.map((result) => ({
      ...result,
      cafeId: result.id,
      reason: 'Keyword match',
      confidenceScore: result.score,
      description: result.description || ''
    }));
  }

  private combineResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[]
  ): SearchResult[] {
    // Create a map to deduplicate and combine scores
    const resultsMap = new Map<string, SearchResult>();

    // Add semantic results
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

    // Add keyword results, combining scores if duplicate
    keywordResults.forEach((result) => {
      const existing = resultsMap.get(result.id);
      if (existing) {
        // Average the scores for duplicate results
        existing.score = (existing.score + result.score) / 2;
      } else {
        resultsMap.set(result.id, result);
      }
    });

    // Convert map to array and sort by score
    return Array.from(resultsMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
  }
}

class GeminiEmbeddings implements Embeddings {
  private geminiClient: any;

  constructor(geminiClient: any) {
    this.geminiClient = geminiClient;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.geminiClient.batchGenerateEmbeddings(texts);
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.geminiClient.generateEmbedding(text);
  }
}
