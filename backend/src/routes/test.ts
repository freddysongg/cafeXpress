import { FastifyInstance } from 'fastify';
import { getAllTest } from '@services/test.js';

export const testRoutes = async (app: FastifyInstance) => {
  app.get<{}>('/', {}, getAllTest);
};
