import { FastifyInstance } from 'fastify';
import {
  createBusinessInsight,
  getBusinessInsightByCafeId,
  getAllBusinessInsights,
  updateBusinessInsight,
  deleteBusinessInsight
} from '@services/business_insights';

export const businessInsightsRoutes = async (app: FastifyInstance) => {
  // Create business insight
  app.post('/', async (req, reply) => {
    try {
      const response = await createBusinessInsight(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error creating business insight:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Get business insight details by Cafe ID
  app.get<{
    Params: {
      cafeId: string;
    };
  }>('/:cafeId', async (req, reply) => {
    try {
      const response = await getBusinessInsightByCafeId(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching business insight by cafe ID:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Get all business insights
  app.get('/all', async (req, reply) => {
    try {
      const response = await getAllBusinessInsights(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching all business insights:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Update business insight
  app.put<{
    Params: {
      cafeId: string;
    };
    Body: Partial<{
      visits: number;
      averageRating: number;
      peakHours: object;
      sentimentAnalysis: object;
    }>;
  }>('/:cafeId', async (req, reply) => {
    try {
      const response = await updateBusinessInsight(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error updating business insight', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Delete business insight by Cafe ID
  app.delete<{
    Params: {
      cafeId: string;
    };
  }>('/:cafeId', async (req, reply) => {
    try {
      const response = await deleteBusinessInsight(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error deleting business insight:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });
};
