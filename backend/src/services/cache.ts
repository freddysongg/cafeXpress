import { getRedisClient } from '@config/redis.js';
import { CacheConfig, DEFAULT_CACHE_CONFIG } from '@schemas/cache.js';

const redisClient = await getRedisClient();

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redisClient.get(key);
    if (!value) {
      console.log(`Cache miss for key: ${key}`);
      return null;
    }
    return JSON.parse(value);
  } catch (error) {
    console.error(`Cache read error for key: ${key}`, error);
    throw error;
  }
}

export async function setCache<T>(key: string, value: T, ttl?: number): Promise<void> {
  const stringValue = JSON.stringify(value);
  if (ttl) {
    await redisClient.set(key, stringValue, { EX: ttl });
  } else {
    await redisClient.set(key, stringValue);
  }
}

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
