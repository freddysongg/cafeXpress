import { FastifyInstance } from 'fastify';
import { getAllTest } from '@services/repository';

export const testRoutes = async (app: FastifyInstance) => {
  app.get<{}>('/', {}, getAllTest);
};
