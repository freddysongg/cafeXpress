export type GeminiClient = {
  analyzeText(text: string): Promise<{
    sentiment: {
      positive: number;
      negative: number;
      neutral: number;
      compound: number;
    };
    entities: string[];
  }>;
  generateContent(prompt: string): Promise<any>;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  analyzeSentiment(text: string): Promise<{ score: number }>;
  batchAnalyzeSentiment(texts: string[]): Promise<Array<{ score: number }>>;
  getModelVersion(): string;
};

export interface GeminiResponse {
  recommendations: {
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
  }[];
  generatedAt: string;
  modelVersion: string;
}

export interface GeminiReviewResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}
