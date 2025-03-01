import { FastifyInstance } from 'fastify';
import { db } from '@config/db.js';
import { cafes } from '@config/schemas.js';
import { generateReviewsForCafe } from '@services/generateReview.js';

export async function generateRoutes(fastify: FastifyInstance) {
  fastify.post('/', async (request, reply) => {
    try {
      //const allCafes = await db.select().from(cafes);
      const firstCafe = await db.select().from(cafes).limit(1); // Get only the first cafe

      // if (allCafes.length === 0) {
      //   return reply.status(404).send({ message: 'No cafes found in the database.' });
      // }

      // for (const cafe of allCafes) {
      //   await generateReviewsForCafe(cafe);
      // }
      await generateReviewsForCafe(firstCafe[0]);

      return reply.status(200).send({ message: 'Fake reviews generated for all cafes.' });
    } catch (error) {
      console.error('Error generating reviews:', error);
      return reply.status(500).send({ message: 'Internal server error.' });
    }
  });
}
