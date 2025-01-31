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
