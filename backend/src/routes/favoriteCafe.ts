import { FastifyInstance } from 'fastify';
import { addFavoriteCafe, removeFavoriteCafe } from '@services/favoriteCafe';

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
}
