import { FastifyInstance } from 'fastify';
import { addFavoriteCafe, removeFavoriteCafe, isFavorited } from '@services/favoriteCafe';

interface RouteParams {
  userId: string;
  cafeId: string;
}

export async function favoriteCafeRoutes(fastify: FastifyInstance) {
  fastify.post('/add', async (request, reply) => {
    const { userId, cafeId } = request.body as { userId: string; cafeId: string };

    if (!userId || !cafeId) {
      return reply.status(400).send({ error: 'Missing userId or cafeId' });
    }

    try {
      const favoriteCafes = await addFavoriteCafe(userId, cafeId);
      return reply.status(200).send({ message: 'Cafe added to favorites', favoriteCafes });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: 'Internal server error.' });
    }
  });

  fastify.delete('/delete', async (request, reply) => {
    const { userId, cafeId } = request.body as { userId: string; cafeId: string };

    if (!userId || !cafeId) {
      return reply.status(400).send({ error: 'Missing userId or cafeId' });
    }

    try {
      const favoriteCafes = await removeFavoriteCafe(userId, cafeId);
      return reply.status(200).send({ message: 'Cafe removed from favorites', favoriteCafes });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: 'Internal server error.' });
    }
  });
  // Register the route
  fastify.get<{ Params: RouteParams }>('/isFavorited/:userId/:cafeId', async (request, reply) => {
    // Extract userId and cafeId from the request parameters
    const { userId, cafeId } = request.params;

    // Check if userId or cafeId is missing
    if (!userId || !cafeId) {
      return reply.status(400).send({ error: 'Missing userId or cafeId' });
    }

    try {
      // Call the isFavorited function with userId and cafeId
      const favorited = await isFavorited(userId, cafeId);

      // Send the response
      return reply.status(200).send({ isFavorited: favorited });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ message: 'Internal server error.' });
    }
  });
}
