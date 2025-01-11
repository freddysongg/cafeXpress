import { FastifyInstance } from 'fastify';
import { fetchAllItems } from '@services/drizzle';

export default async function routes(fastify: FastifyInstance) {
  fastify.get('/', async (_, reply) => {
    const items = await fetchAllItems();
    reply.send(items);
  });
}
