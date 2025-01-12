import { FastifyRequest } from 'fastify';

export interface RecommendationsRequest extends FastifyRequest {
  params: {
    userId: string;
  };
}
