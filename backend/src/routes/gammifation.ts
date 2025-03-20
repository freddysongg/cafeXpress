import { FastifyInstance } from 'fastify';
import { determineMostFrequentCategory } from '@services/gammification';

export const gammifcationRoute = async (app: FastifyInstance) => {
  // Determine the most frequent category for a user's favorite cafes
  app.get('/:userId', determineMostFrequentCategory); 
};