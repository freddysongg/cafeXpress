import { FastifyInstance } from 'fastify';
import { getUserDetails } from '@services/user';

export const usersRoutes = async (app: FastifyInstance) => {
  // Get user details by ID
  app.get<{
    Params: {
      userId: string;
    };
  }>('/:userId', async (req, reply) => {
    try {
      const response = await getUserDetails(req);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching user details:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });
};
