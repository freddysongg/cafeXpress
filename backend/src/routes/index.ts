import { FastifyInstance } from 'fastify';
import { getAllUsers } from '@services/repository';

export default async function routes(fastify: FastifyInstance) {
  fastify.get('/', async (_, reply) => {
    const items = await getAllUsers();
    reply.send(items);
  });
}
