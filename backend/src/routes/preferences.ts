import { FastifyInstance } from 'fastify';
import {
  createPreferences,
  getPreferencesByUserId,
  getAllPreferences,
  updatePreferences,
  deletePreferences
} from '@services/preferences.js';

export const preferencesRoutes = async (app: FastifyInstance) => {
  // Create preferences
  app.post('/', async (req, reply) => {
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
    Body: Partial<{
      favoriteCafes: any;
      dietaryRestrictions: any;
      ambiance: any;
    }>;
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
