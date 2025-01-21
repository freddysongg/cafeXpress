import { createClient } from 'redis';
import { GeminiResponse } from '@schemas/recommendation.js';
import type { z } from 'zod';

type GeminiResponseType = z.infer<typeof GeminiResponse>;

interface CacheConfig {
  ttl: number; // TTL in seconds
  maxMemory?: string; // Max memory for Redis in bytes (e.g., '100mb')
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

  async set(key: string, response: GeminiResponseType): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(response), {
        EX: this.config.ttl
      });
    } catch (err) {
      console.error('Redis set error:', err);
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error('Redis delete error:', err);
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
  maxMemory: '100mb'
};
