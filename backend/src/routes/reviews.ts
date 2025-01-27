import { FastifyInstance } from 'fastify';
import {
  createReview,
  getReviewById,
  getReviewsByCafeId,
  updateReview,
  deleteReview
} from '@services/reviews.js';

import { ReviewBody } from '@schemas/reviews';

interface ReviewParams {
  reviewId: string;
}

interface CafeParams {
  cafeId: string;
}

export const reviewsRoutes = async (app: FastifyInstance) => {
  // Create review
  app.post<{ Body: ReviewBody }>('/', async (req, reply) => {
    try {
      await createReview(req, reply); // No need to resend response; handled in service
    } catch (error) {
      app.log.error('Error creating review:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Get review details by ID
  app.get<{ Params: ReviewParams }>('/:reviewId', async (req, reply) => {
    try {
      await getReviewById(req, reply);
    } catch (error) {
      app.log.error('Error fetching review details:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Get all reviews for a cafe
  app.get<{ Params: CafeParams }>('/:cafeId/all', async (req, reply) => {
    try {
      await getReviewsByCafeId(req, reply);
    } catch (error) {
      app.log.error('Error fetching reviews for cafe:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Update review
  app.put<{ Params: ReviewParams; Body: Partial<ReviewBody> }>('/:reviewId', async (req, reply) => {
    try {
      await updateReview(req, reply);
    } catch (error) {
      app.log.error('Error updating review:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Delete review by ID
  app.delete<{ Params: ReviewParams }>('/:reviewId', async (req, reply) => {
    try {
      await deleteReview(req, reply);
    } catch (error) {
      app.log.error('Error deleting review:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });
};
