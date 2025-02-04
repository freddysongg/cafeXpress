import { createClient } from 'redis';

export interface RedisClient extends ReturnType<typeof createClient> {
  isConnected: boolean;
}

let redisClient: RedisClient;

export async function createRedisClient(): Promise<RedisClient> {
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      connectTimeout: 5000,
      keepAlive: 30000
    },
    pingInterval: 60000,
    disableOfflineQueue: true
  }) as RedisClient;

  client.isConnected = false;

  client.on('connect', () => {
    client.isConnected = true;
  });

  client.on('error', (err) => {
    console.error('Redis error:', err);
    client.isConnected = false;
  });

  client.on('reconnecting', () => {
    console.log('Reconnecting to Redis...');
  });

  client.on('end', () => {
    console.log('Redis connection closed');
    client.isConnected = false;
  });

  await client.connect();
  return client;
}

export async function getRedisClient(): Promise<RedisClient> {
  if (!redisClient) {
    redisClient = await createRedisClient();
  }
  return redisClient;
}
