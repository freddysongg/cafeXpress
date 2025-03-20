import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { users, reviews } from '@config/schemas.js';
import { eq } from 'drizzle-orm';

/**
 * Get Profile by User ID
 */
export async function getProfile(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    //console.log('User in getProfile:', req.user);  // Debugging output
    const userId = req.user?.id;
    if (!userId) {
      reply.status(400).send({ status: 'error', message: 'User ID is missing' });
      return;
    }

    const user = await db
      .select({
        createdAt: users.createdAt,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        location: users.location
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      reply.status(404).send({ status: 'error', message: 'User not found.' });
      return;
    }

    // Fetch reviews associated with the user
    const userReviews = await db
      .select({
        id: reviews.id,
        cafeId: reviews.cafeId,
        rating: reviews.rating,
        description: reviews.description,
        title: reviews.title,
        createdAt: reviews.createdAt
      })
      .from(reviews)
      .where(eq(reviews.userId, userId));

    reply.send({
      status: 'success',
      message: 'User profile retrieved',
      data: {
        ...user[0],
        reviews: userReviews
      }
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching user profile:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}
