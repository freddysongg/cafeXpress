import { FastifyReply, FastifyRequest } from 'fastify';
import { User } from 'types/fastify.d.js';
import jwt from 'jsonwebtoken';

export async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return reply.status(401).send({
        status: 'error',
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as User;

    req.user = decoded; // Attach user data to the request object
  } catch (error) {
    const err = error as Error;
    console.error('Error authenticating user:', err.message);
    return reply.status(401).send({
      status: 'error',
      message: 'Invalid token.'
    });
  }
}
