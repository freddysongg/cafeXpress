import { FastifyInstance, FastifyRequest } from 'fastify';
import { getProfile } from '@services/profile.js';
import { authenticate } from 'middleware/authentication.js';


export const profileRoutes = async (app: FastifyInstance) => {
  // Get user profile by ID
  app.get(
    '/',
    { preHandler: authenticate },
    async (req, reply) => {
      try {
        //console.log('User from token:', req.user);  // Log the user data
        const response = await getProfile(req, reply);
        reply.send(response);
      } catch (error) {
        app.log.error('Error fetching user profile:', error);
        reply.status(500).send({ status: 'error', message: 'Internal server error' });
      }
    }
  );
};
