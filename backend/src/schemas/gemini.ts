export type GeminiClient = {
  analyzeText(text: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    entities: string[];
  }>;
  generateContent(prompt: string): Promise<any>;
  generateEmbedding(text: string): Promise<number[]>;
  getModelVersion(): string;
};
