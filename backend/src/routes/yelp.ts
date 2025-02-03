import { FastifyInstance } from 'fastify';
import { fetchCafes } from '@services/yelp.js';

export const yelpRoutes = async (app: FastifyInstance) => {
  // Define the /cafes route
  app.get('/cafes', fetchCafes);
};
