// routes/auth.ts
import { FastifyInstance } from 'fastify';
import { registerUser, loginUser } from '@services/authentication.js';
import { RegisterBody, LoginBody } from '@schemas/authentication.js';

export const authenticationRoutes = async (app: FastifyInstance) => {
  // Register a new user
  app.post<{ Body: RegisterBody }>('/register', async (req, reply) => {
    try {
      const response = await registerUser(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error registering user:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Login user
  app.post<{ Body: LoginBody }>('/login', async (req, reply) => {
    try {
      const response = await loginUser(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error logging in user:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });
};
