import { FastifyInstance } from 'fastify';
import { createUser, getUserById, getAllUsers, updateUser, deleteUser } from '@services/user.js';
import { authenticate } from 'middleware/authentication.js';

export const usersRoutes = async (app: FastifyInstance) => {
  //Create user
  app.post('/', async (req, reply) => {
    try {
      const response = await createUser(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error creating user:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Get user details by ID
  app.get<{
    Params: {
      userId: string;
    };
  }>('/:userId', async (req, reply) => {
    try {
      const response = await getUserById(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching user details:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  //Get all users
  app.get('/all', async (req, reply) => {
    try {
      const response = await getAllUsers(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching users:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  //Update user
  app.put<{
    Params: {
      userId: string;
    };

    Body: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }>;
  }>('/:userId', { preHandler: authenticate }, async (req, reply) => {
    try {
      const response = await updateUser(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error updating user', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Delete user by ID
  app.delete<{
    Params: {
      userId: string;
    };
  }>('/:userId', { preHandler: authenticate }, async (req, reply) => {
    try {
      const response = await deleteUser(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error deleting user:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });
};
