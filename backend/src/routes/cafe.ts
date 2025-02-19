import { FastifyInstance } from 'fastify';
import { createCafe, getCafeById, getAllCafes, updateCafe, deleteCafe } from '@services/cafe.js';
import { CafeParams, CafeBody } from '@schemas/cafe.js';

export const cafesRoutes = async (app: FastifyInstance) => {
  // Create a new cafe
  app.post<{ Body: CafeBody }>('/', async (req, reply) => {
    try {
      const response = await createCafe(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error creating cafe:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  app.get<{ Params: CafeParams }>('/:id', async (req, reply) => {
    try {
      const response = await getCafeById(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching cafe details:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Get all cafes
  app.get('/all', async (req, reply) => {
    try {
      const response = await getAllCafes(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching cafes:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Update cafe details
  app.put<{ Params: CafeParams; Body: CafeBody }>('/:cafeId', async (req, reply) => {
    try {
      const response = await updateCafe(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error updating cafe:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Delete cafe by ID
  app.delete<{ Params: CafeParams }>('/:cafeId', async (req, reply) => {
    try {
      const response = await deleteCafe(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error deleting cafe:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });
};
