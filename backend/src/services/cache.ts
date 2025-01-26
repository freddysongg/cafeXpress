import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

await redisClient.connect();

export async function getCache<T>(key: string): Promise<T | null> {
  const value = await redisClient.get(key);
  return value ? JSON.parse(value) : null;
}

export async function setCache<T>(key: string, value: T, ttl?: number): Promise<void> {
  const stringValue = JSON.stringify(value);
  if (ttl) {
    await redisClient.set(key, stringValue, { EX: ttl });
  } else {
    await redisClient.set(key, stringValue);
  }
}

export interface CacheConfig {
  ttl: number;
  prefix: string;
  maxSize?: number;
  staleWhileRevalidate?: number;
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 60 * 60 * 24 * 7, // 1 week
  prefix: 'semantic:',
  maxSize: 1000,
  staleWhileRevalidate: 60 * 60 // 1 hour
};

export class RecommendationCache {
  private prefix: string;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.prefix = this.config.prefix;
  }

  async get<T>(key: string): Promise<T | null> {
    return getCache<T>(`${this.prefix}${key}`);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    return setCache<T>(`${this.prefix}${key}`, value, ttl);
  }

  async clear(key: string): Promise<void> {
    return clearCache(`${this.prefix}${key}`);
  }
}

export async function clearCache(key: string): Promise<void> {
  await redisClient.del(key);
}
