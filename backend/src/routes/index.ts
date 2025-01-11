import { FastifyInstance } from 'fastify';
import { getAllTest } from '@services/repository';

export default async function routes(fastify: FastifyInstance) {
  fastify.get('/', async (_, reply) => {
    const items = await getAllTest();
    reply.send(items);
  });
}
