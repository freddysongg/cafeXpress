import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { recommendationRoutes } from '@routes/recommendation.js';
import { usersRoutes } from './user.js';
import { cafesRoutes } from './cafe.js';
import { reviewsRoutes } from './reviews.js';
import { preferencesRoutes } from './preferences.js';
import { authenticationRoutes } from './authentication.js';
import { yelpRoutes } from './yelp.js';
import { profileRoutes } from './profile.js';
import { generateRoutes } from './generateReview.js';
import { favoriteCafeRoutes } from './favoriteCafe.js';

const routes = async (app: FastifyInstance) => {
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ message: 'Welcome to cafeXpress.' });
  });
  app.register(usersRoutes, { prefix: '/user' });
  app.register(cafesRoutes, { prefix: '/cafe' });
  app.register(reviewsRoutes, { prefix: '/review' });
  app.register(preferencesRoutes, { prefix: '/preference' });
  app.register(authenticationRoutes, { prefix: '/auth' });
  app.register(yelpRoutes, { prefix: '/yelp' });
  app.register(profileRoutes, { prefix: '/profile' });
  app.register(recommendationRoutes, { prefix: '/recommendations' });
  app.register(generateRoutes, { prefix: '/generateReviews' });
  app.register(favoriteCafeRoutes, {prefix: '/favoriteCafe' })
};

export default routes;
