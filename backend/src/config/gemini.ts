import { GoogleGenerativeAI } from '@google/generative-ai';
import type { FastifyInstance } from 'fastify';
import type { GeminiClient } from '@schemas/gemini.js';

class GeminiClientImpl implements GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private modelVersion: string;

  constructor(apiKey: string, modelVersion: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelVersion = modelVersion;
  }

  async initialize() {
    this.model = await this.genAI.getGenerativeModel({
      model: this.modelVersion
    });
  }

  getModelVersion(): string {
    return this.modelVersion;
  }

  async analyzeText(text: string) {
    const prompt = `Analyze this text and return JSON with sentiment analysis and entities:
    ${text}
    
    Return JSON in this format:
    {
      "sentiment": "positive|neutral|negative",
      "entities": ["entity1", "entity2"]
    }`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const json = JSON.parse(response.text());

    return {
      sentiment: json.sentiment,
      entities: json.entities
    };
  }

  async generateContent(prompt: string) {
    const result = await this.model.generateContent(prompt);
    return result.response;
  }

  async generateEmbedding(text: string) {
    const result = await this.model.embedContent(text);
    return result.embedding.values;
  }

  async generateEmbeddings(texts: string[]) {
    const results = await Promise.all(texts.map((text) => this.model.embedContent(text)));
    return results.map((result) => result.embedding.values);
  }

  async analyzeSentiment(text: string) {
    const prompt = `Analyze the sentiment of this text and return a score between -1 (negative) and 1 (positive):
    ${text}
    
    Return JSON in this format:
    {
      "score": number
    }`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const json = JSON.parse(response.text());
    return { score: json.score };
  }

  async batchAnalyzeSentiment(texts: string[]) {
    const results = await Promise.all(texts.map((text) => this.analyzeSentiment(text)));
    return results;
  }
}

export function setupGeminiClient(app: FastifyInstance) {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelVersion = process.env.GEMINI_MODEL_VERSION;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  if (!modelVersion) {
    throw new Error('GEMINI_MODEL_VERSION environment variable is required');
  }

  const client = new GeminiClientImpl(apiKey, modelVersion);
  client.initialize();

  app.decorate('gemini', client);
}
