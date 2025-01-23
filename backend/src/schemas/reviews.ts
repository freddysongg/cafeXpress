import { FastifySchema } from 'fastify';

export interface CreateReviewBody {
  cafeId: string;
  userId: string;
  rating: number;
  text: string;
  description?: string;
  comment?: string;
}

export interface UpdateReviewBody {
  rating?: number;
  text?: string;
  description?: string;
  comment?: string;
}

export const createReviewSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['cafeId', 'userId', 'rating', 'text'],
    properties: {
      cafeId: { type: 'string' },
      userId: { type: 'string' },
      rating: { type: 'number', minimum: 1, maximum: 5 },
      text: { type: 'string', minLength: 10 },
      description: { type: 'string' },
      comment: { type: 'string' }
    }
  }
};

export const updateReviewSchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      rating: { type: 'number', minimum: 1, maximum: 5 },
      text: { type: 'string', minLength: 10 },
      description: { type: 'string' },
      comment: { type: 'string' }
    }
  }
};
