import { FastifyInstance } from 'fastify';
import {
  createPreferences,
  getPreferencesByUserId,
  getAllPreferences,
  updatePreferences,
  deletePreferences,
  updateUserPreferences,
  getUserPreferences
} from '@services/preferences.js';
import { PreferencesType, UpdatePreferencesType } from '@schemas/preferences.js';
import { authenticate } from '../middleware/authentication.js';

export const preferencesRoutes = async (app: FastifyInstance) => {
  // Get current user's preferences
  app.get('/current', { preHandler: authenticate }, async (req, reply) => {
    try {
      if (!req.user?.id) {
        return reply.status(401).send({
          status: 'error',
          message: 'User ID not found in token'
        });
      }
      const response = await getUserPreferences(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching user preferences:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Update current user's preferences
  app.put<{
    Body: UpdatePreferencesType;
  }>('/current', { preHandler: authenticate }, async (req, reply) => {
    try {
      if (!req.user?.id) {
        return reply.status(401).send({
          status: 'error',
          message: 'User ID not found in token'
        });
      }
      const response = await updateUserPreferences(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error updating user preferences:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Create preferences
  app.post<{
    Body: PreferencesType;
  }>('/', async (req, reply) => {
    try {
      const response = await createPreferences(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error creating preferences:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Get preferences by user ID
  app.get<{
    Params: {
      userId: string;
    };
  }>('/:userId', async (req, reply) => {
    try {
      const response = await getPreferencesByUserId(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching preferences:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Get all preferences
  app.get('/all', async (req, reply) => {
    try {
      const response = await getAllPreferences(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching preferences:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Update preferences for a user
  app.put<{
    Params: {
      userId: string;
    };
    Body: {
      preferences: {
        dietary: string[];
        ambiance: string[];
        activities: string[];
        drinks: string[];
        vibes: string[];
        coffee: string[];
      };
    };
  }>('/:userId', async (req, reply) => {
    try {
      const response = await updatePreferences(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error updating preferences:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Delete preferences by user ID
  app.delete<{
    Params: {
      userId: string;
    };
  }>('/:userId', async (req, reply) => {
    try {
      const response = await deletePreferences(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error deleting preferences:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });
};
