import { FastifyInstance } from 'fastify';
import { getRecommendationsWithGemini } from '@services/recommendation.js';

export const recommendationRoutes = async (app: FastifyInstance) => {
  app.get<{
    Params: {
      userId: string;
    };
  }>('/:userId', async (req, reply) => {
    try {
      const response = await getRecommendationsWithGemini(req, app.geminiClient);
      reply.send(response);
    } catch (error) {
      app.log.error('Error in recommendation route:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });
};
