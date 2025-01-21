export interface ReviewAnalysis {
  id: string;
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  entities: string[];
}

export interface VectorMetadata {
  id: string;
  name: string;
  description: string;
}

export interface VectorWithScore {
  id: string;
  embedding: number[];
  metadata: VectorMetadata;
  score: number;
}

export interface SearchResult {
  id: string;
  cafeId: string;
  name: string;
  description: string;
  address?: string;
  city?: string;
  state?: string;
  score: number;
  reason: string;
  confidenceScore: number;
  metadata?: {
    name: string;
    description: string;
  };
}

export interface GeminiResponse {
  recommendations: SearchResult[];
  generatedAt: string;
  modelVersion: string;
}

export interface SearchResponse {
  status: 'success' | 'error';
  data?: SearchResult[];
  message?: string;
}

export interface Embeddings {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export interface GeminiClient {
  generateEmbedding(text: string): Promise<number[]>;
  batchGenerateEmbeddings(texts: string[]): Promise<number[][]>;
  batchAnalyzeSentiment(texts: string[]): Promise<Array<{ score: number }>>;
}
