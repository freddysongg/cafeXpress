import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { testRoutes } from '@routes/test';
import { recommendationRoutes } from '@routes/recommendation';

const routes = async (app: FastifyInstance) => {
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: 'Welcome to cafeXpress.' });
  });
  app.register(testRoutes, { prefix: '/test' });
  app.register(recommendationRoutes, { prefix: '/recommendations' });
};

export default routes;
