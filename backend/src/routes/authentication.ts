// routes/auth.ts
import { FastifyInstance } from 'fastify';
import { registerUser, loginUser, updateUserPassword } from '@services/authentication.js';
import { RegisterBody, LoginBody } from '@schemas/authentication.js';

// Define the request body type for updatePassword
interface UpdatePasswordBody {
  currentPassword: string;
  newPassword: string;
}

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

  // Update Password Route
  app.put<{ Params: { userId: string }; Body: UpdatePasswordBody }>(
    '/updatePassword/:userId',
    async (req, reply) => {
      try {
        const response = await updateUserPassword(req, reply);
        reply.send(response);
      } catch (error) {
        app.log.error('Error updating password:', error);
        reply.status(500).send({ status: 'error', message: 'Internal server error' });
      }
    }
  );
};
