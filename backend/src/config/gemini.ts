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
    // Process in batches of 10 to avoid rate limits
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      batches.push(batch);
    }

    const results = [];
    for (const batch of batches) {
      const batchResults = await Promise.all(batch.map((text) => this.model.embedContent(text)));
      results.push(...batchResults.map((result) => result.embedding.values));

      // Add a small delay between batches to respect rate limits
      if (batches.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  async analyzeSentiment(text: string) {
    const prompt = `Analyze the sentiment of this text and return a score between 0 (negative) and 1 (positive).
    Return ONLY a JSON object with a single "score" field, nothing else.
    Text to analyze: ${text}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();

    // Remove any markdown formatting if present
    const jsonStr = responseText.replace(/```json\n|\n```|```/g, '').trim();

    try {
      const json = JSON.parse(jsonStr);
      return { score: Number(json.score) };
    } catch (error) {
      console.error('Failed to parse sentiment response:', responseText);
      // Fallback to neutral sentiment
      return { score: 0.5 };
    }
  }

  async batchAnalyzeSentiment(texts: string[]) {
    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    const batches = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      batches.push(batch);
    }

    const results = [];
    for (const batch of batches) {
      const batchResults = await Promise.all(batch.map((text) => this.analyzeSentiment(text)));
      results.push(...batchResults);

      // Add a small delay between batches to respect rate limits
      if (batches.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

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
