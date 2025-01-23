import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { recommendationRoutes } from '@routes/recommendation.js';
import { usersRoutes } from './user';
import { cafesRoutes } from './cafe';
import { reviewsRoutes } from './reviews';
import { preferencesRoutes } from './preferences';

const routes = async (app: FastifyInstance) => {
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: 'Welcome to cafeXpress.' });
  });
  app.register(recommendationRoutes, { prefix: '/recommendations' });
  app.register(usersRoutes, { prefix: '/user' });
  app.register(cafesRoutes, { prefix: '/cafe' });
  app.register(reviewsRoutes, { prefix: '/review' });
  app.register(preferencesRoutes, { prefix: '/preference' });
};

export default routes;
