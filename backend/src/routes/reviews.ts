import { FastifyInstance } from 'fastify';
import {
  createReview,
  getReviewById,
  getReviewsByCafeId,
  updateReview,
  deleteReview
} from '@services/reviews.js';

export const reviewsRoutes = async (app: FastifyInstance) => {
  // Create review
  app.post('/', async (req, reply) => {
    try {
      const response = await createReview(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error creating review:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Get review details by ID
  app.get<{
    Params: {
      reviewId: string;
    };
  }>('/:reviewId', async (req, reply) => {
    try {
      const response = await getReviewById(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching review details:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Get all reviews for a cafe
  app.get<{
    Params: {
      cafeId: string;
    };
  }>('/:cafeId/all', async (req, reply) => {
    try {
      const response = await getReviewsByCafeId(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching reviews for cafe:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Update review
  app.put<{
    Params: {
      reviewId: string;
    };
    Body: Partial<{
      rating: number;
      description: string;
    }>;
  }>('/:reviewId', async (req, reply) => {
    try {
      const response = await updateReview(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error updating review:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Delete review by ID
  app.delete<{
    Params: {
      reviewId: string;
    };
  }>('/:reviewId', async (req, reply) => {
    try {
      const response = await deleteReview(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error deleting review:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });
};
