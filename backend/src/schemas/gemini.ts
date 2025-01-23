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
