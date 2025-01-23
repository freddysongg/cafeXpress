import { z } from 'zod';
import rateLimitPlugin from '@fastify/rate-limit';
import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';

export const rateLimitConfig = z.object({
  windowMs: z.number().min(60000),
  max: z.number().min(1),
  message: z.string().optional(),
  statusCode: z.number().min(400).max(429).optional(),
  skipFailedRequests: z.boolean().optional()
});

export type RateLimitConfig = z.infer<typeof rateLimitConfig>;

export const createRateLimiter = (config: RateLimitConfig) => {
  return async (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
    await request.server.register(rateLimitPlugin, {
      max: config.max,
      timeWindow: config.windowMs,
      errorResponseBuilder: (req: FastifyRequest, context: { after: string }) => ({
        status: 'error',
        message: config.message || 'Too many requests',
        retryAfter: context.after
      })
    });
  };
};

export const rateLimit = (namespace: string, config: RateLimitConfig) => {
  return createRateLimiter(config);
};
