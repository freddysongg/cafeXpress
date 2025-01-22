import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { testRoutes } from '@routes/test.js';
import { recommendationRoutes } from '@routes/recommendation.js';
import { usersRoutes } from './user';
import { cafesRoutes } from './cafe';
import { reviewsRoutes } from './reviews';
import { preferences } from '@config/schemas';
import { preferencesRoutes } from './preferences';
import { businessInsightsRoutes } from './business_insights';

const routes = async (app: FastifyInstance) => {
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: 'Welcome to cafeXpress.' });
  });
  app.register(testRoutes, { prefix: '/test' });
  app.register(recommendationRoutes, { prefix: '/recommendations' });
  app.register(usersRoutes, {prefix: '/user'});
  app.register(cafesRoutes, {prefix: '/cafe'});
  app.register(reviewsRoutes, {prefix: '/review'});
  app.register(preferencesRoutes, {prefix: '/preference'});
  app.register(businessInsightsRoutes, {prefix: '/business_insights'})
};

export default routes;
