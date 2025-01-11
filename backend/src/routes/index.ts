import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { testRoutes } from '@routes/test';

const routes = async (app: FastifyInstance) => {
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: 'Welcome to cafeXpress.' });
  });
  app.register(testRoutes, { prefix: '/test' });
};

export default routes;
