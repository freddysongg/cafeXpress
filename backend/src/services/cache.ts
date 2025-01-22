import { createClient } from 'redis';
import { GeminiResponse } from '@schemas/recommendation.js';
import type { z } from 'zod';

type GeminiResponseType = z.infer<typeof GeminiResponse>;

interface CacheConfig {
  ttl: number; // TTL in seconds
  maxMemory?: string; // Max memory for Redis in bytes (e.g., '100mb')
  sentimentTtl?: number; // TTL for sentiment-specific cache entries
  warmQueries?: string[]; // Common queries to pre-cache
}

export class RecommendationCache {
  private client: ReturnType<typeof createClient>;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.client = createClient({
      url: process.env.REDIS_URL,
      username: process.env.REDIS_USER,
      password: process.env.REDIS_PASSWORD
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.client.connect();
  }

  async get(key: string): Promise<GeminiResponseType | null> {
    try {
      const cached = await this.client.get(key);
      if (!cached) return null;
      return JSON.parse(cached);
    } catch (err) {
      console.error('Redis get error:', err);
      return null;
    }
  }

  async set(key: string, response: GeminiResponseType, sentiment?: string): Promise<void> {
    try {
      const cacheKey = sentiment ? `${key}:${sentiment}` : key;
      const ttl = sentiment ? this.config.sentimentTtl || this.config.ttl : this.config.ttl;

      await this.client.set(cacheKey, JSON.stringify(response), {
        EX: ttl
      });

      // Store metadata about the cache entry
      await this.client.hSet(`metadata:${cacheKey}`, {
        generatedAt: new Date().toISOString(),
        sentiment: sentiment || 'neutral',
        query: key,
        modelVersion: response.modelVersion
      });
    } catch (err) {
      console.error('Redis set error:', err);
    }
  }

  async invalidate(key: string, sentiment?: string): Promise<void> {
    try {
      const cacheKey = sentiment ? `${key}:${sentiment}` : key;
      await this.client.del(cacheKey);
      await this.client.del(`metadata:${cacheKey}`);

      // Invalidate all sentiment variations if no specific sentiment provided
      if (!sentiment) {
        const keys = await this.client.keys(`${key}:*`);
        await Promise.all(keys.map((k) => this.client.del(k)));
        await Promise.all(keys.map((k) => this.client.del(`metadata:${k}`)));
      }
    } catch (err) {
      console.error('Redis delete error:', err);
    }
  }

  async warmCache(): Promise<void> {
    if (!this.config.warmQueries?.length) return;

    try {
      // Warm cache with common queries
      await Promise.all(
        this.config.warmQueries.map(async (query) => {
          const exists = await this.client.exists(query);
          if (!exists) {
            // ------------------------------- TO DO: fetch actual data from db once it is set up ----------------------------------------------------------
            await this.set(query, {
              recommendations: [],
              generatedAt: new Date().toISOString(),
              modelVersion: '1.0.0'
            });
          }
        })
      );
    } catch (err) {
      console.error('Cache warming error:', err);
    }
  }

  async close(): Promise<void> {
    try {
      await this.client.quit();
    } catch (err) {
      console.error('Redis close error:', err);
    }
  }
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 600, // 10 minutes
  sentimentTtl: 3600, // 1 hour for sentiment-specific entries
  maxMemory: '100mb',
  warmQueries: ['coffee', 'vegan', 'quiet', 'outdoor seating', 'wifi']
};
