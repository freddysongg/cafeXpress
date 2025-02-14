import { FastifyInstance } from 'fastify';
import { fetchCafes } from '@services/yelp.js';

//http://localhost:8000/yelp/cafes?location=Riverside,+CA&limit=1

export const yelpRoutes = async (app: FastifyInstance) => {
  // Define the /cafes route
  app.get('/cafes', fetchCafes);
};
