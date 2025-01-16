import { FastifyInstance } from 'fastify';
import { users } from '@config/schemas';
import { db } from '@config/db';

export async function userRoutes(fastify: FastifyInstance) {
    //CREATE
    fastify.post('/users', async (request, reply) => {
        const { username, firstName, lastName, email, phone, password, description } = request.body;
        const newUser = await db.insert(users).values({ username, firstName, lastName, email, phone, password, description });
        return reply.status(201).send(newUser);
    });

    //GET
    fastify.get('/users', async () => {
        const allUsers = await db.select().from(users);
        return allUsers;
    });

    //GET: BY USER ID
    fastify.get('/users/:id', async (request, reply) => {
        const { id } = request.params;
        const user = await db.select().from(users).where(users.id.eq(id)).first();
        if (!user) {
            return reply.status(404).send({ message: 'User not found' });
        }
        return reply.send(user);
    });

    //UPDATE
    fastify.put('/users/:id', async (request, reply) => {
        const { id } = request.params;
        const { username, firstName, lastName, email, phone, password, description } = request.body;
        const updatedUser = await db.update(users)
        .set({ username, firstName, lastName, email, phone, password, description })
        .where(users.id.eq(id))
        .returning();
        if (!updatedUser) {
            return reply.status(404).send({ message: 'User not found' });
        }
        return reply.send(updatedUser);
    });

     //DELETE
    fastify.delete('/users/:id', async (request, reply) => {
        const { id } = request.params;
        const deletedUser = await db.delete(users).where(users.id.eq(id));
        if (!deletedUser) {
        return reply.status(404).send({ message: 'User not found' });
        }
        return reply.send({ message: 'User deleted successfully' });
    });
}