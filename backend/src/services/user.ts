import { FastifyRequest } from 'fastify';
import { db } from '@config/db.js'
import { users } from '@config/schemas';
import { eq } from 'drizzle-orm';

/**
 * Fetch user details with their preferences and context.
 */
export async function getUserDetails(
  req: FastifyRequest<{ Params: { userId: string } }>
) {
  try {
    const userId = req.params.userId;

    // Fetch user details
    const user = await db
      .select({
        username: users.username,
        email: users.email,
        description: users.description,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return {
        status: 'error',
        message: 'User not found.'
      };
    }

    return {
      status: 'success',
      data: {
        username: user[0].username,
        email: user[0].email,
        description: user[0].description,
        createdAt: user[0].createdAt
      }
    };
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching user details:', err.message);
    return {
      status: 'error',
      message: err.message
    };
  }
}