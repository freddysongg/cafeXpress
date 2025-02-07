import { FastifyInstance } from 'fastify';
import { getProfile } from '@services/profile.js';
//import { authenticate } from 'middleware/authentication.js';

export const profileRoutes = async (app: FastifyInstance) => {
  // Get user profile by ID
  app.get<{
    Params: {
      userId: string;
    };
  }>(
    '/:userId',
    //{ preHandler: authenticate },
    async (req, reply) => {
      try {
        const response = await getProfile(req, reply);
        reply.send(response);
      } catch (error) {
        app.log.error('Error fetching user profile:', error);
        reply.status(500).send({ status: 'error', message: 'Internal server error' });
      }
    }
  );
};
