import { FastifyInstance } from 'fastify';
import { createCafe, getCafeById, getAllCafes, updateCafe, deleteCafe } from '@services/cafe';

export const cafesRoutes = async (app: FastifyInstance) => {
  // Create a new cafe
  app.post<{
    Body: {
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      ownerId?: string;
      ambiance?: object;
      dietaryOptions?: object;
    };
  }>('/', async (req, reply) => {
    try {
      const response = await createCafe(req);
      reply.send(response);
    } catch (error) {
      app.log.error('Error creating cafe:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Get cafe details by ID
  app.get<{
    Params: {
      cafeId: string;
    };
  }>('/:cafeId', async (req, reply) => {
    try {
      const response = await getCafeById(req);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching cafe details:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Get all cafes
  app.get('/all', async (req, reply) => {
    try {
      const response = await getAllCafes(req);
      reply.send(response);
    } catch (error) {
      app.log.error('Error fetching cafes:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Update cafe details
  app.patch<{
    Params: {
      cafeId: string;
    };
    Body: Partial<{
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      ambiance?: object;
      dietaryOptions?: object;
    }>;
  }>('/:cafeId', async (req, reply) => {
    try {
      const response = await updateCafe(req);
      reply.send(response);
    } catch (error) {
      app.log.error('Error updating cafe:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });

  // Delete cafe by ID
  app.delete<{
    Params: {
      cafeId: string;
    };
  }>('/:cafeId', async (req, reply) => {
    try {
      const response = await deleteCafe(req);
      reply.send(response);
    } catch (error) {
      app.log.error('Error deleting cafe:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });
};
