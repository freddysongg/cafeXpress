import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createCafe, getCafeById, getAllCafes, updateCafe, deleteCafe } from '@services/cafe';
import { CafeSchema, UpdateCafeSchema } from '@services/schemas/cafe';

export const cafesRoutes = async (app: FastifyInstance) => {
  // Create a new cafe
  app.post('/', async (req, reply) => {
    try {
      const validatedBody = CafeSchema.parse(req.body);
      const response = await createCafe({ ...req, body: validatedBody }, reply);
      reply.send(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          status: 'error',
          message: 'Validation error',
          errors: error.errors
        });
      } else {
        app.log.error('Error creating cafe:', error);
        reply.status(500).send({ status: 'error', message: 'Internal server error' });
      }
    }
  });

  //Get cafe details by ID
  app.get<{
    Params: {
      cafeId: string;
    };
  }>('/:cafeId', async (req, reply) => {
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
  app.put<{
    Params: { cafeId: string };
    Body: z.infer<typeof UpdateCafeSchema>;
  }>('/:cafeId', async (req, reply) => {
    try {
      // Validate params (cafeId must be a valid UUID)
      const paramsSchema = z.object({ cafeId: z.string().uuid('Invalid Cafe ID format') });
      const validatedParams = paramsSchema.parse(req.params);

      // Validate body using UpdateCafeSchema
      const validatedBody = UpdateCafeSchema.parse(req.body);

      const response = await updateCafe(
        {
          ...req,
          params: validatedParams,
          body: validatedBody
        },
        reply
      );
      reply.send(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          status: 'error',
          message: 'Validation error',
          errors: error.errors
        });
      } else {
        app.log.error('Error updating cafe:', error);
        reply.status(500).send({ status: 'error', message: 'Internal server error' });
      }
    }
  });

  // Delete cafe by ID
  app.delete<{
    Params: {
      cafeId: string;
    };
  }>('/:cafeId', async (req, reply) => {
    try {
      const response = await deleteCafe(req, reply);
      reply.send(response);
    } catch (error) {
      app.log.error('Error deleting cafe:', error);
      reply.status(500).send({ status: 'error', message: 'Internal server error' });
    }
  });
};
