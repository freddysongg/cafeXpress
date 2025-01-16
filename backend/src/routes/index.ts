import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { testRoutes } from '@routes/test.js';
import { recommendationRoutes } from '@routes/recommendation.js';

const routes = async (app: FastifyInstance) => {
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: 'Welcome to cafeXpress.' });
  });
  app.register(testRoutes, { prefix: '/test' });
  app.register(recommendationRoutes, { prefix: '/recommendations' });
};

export default routes;
