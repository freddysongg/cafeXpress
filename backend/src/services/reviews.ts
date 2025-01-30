import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { reviews, users, cafes } from '@config/schemas.js';
import { eq } from 'drizzle-orm';
import { ReviewBody } from '@schemas/reviews.js';

/**
 * Create Review
 */
export async function createReview(
  req: FastifyRequest<{ Body: ReviewBody }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { userId, cafeId, rating, text, sentimentScore, entities } = req.body;

    const userExists = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!userExists.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'User not found.'
      });
    }

    const cafeExists = await db.select().from(cafes).where(eq(cafes.id, cafeId)).limit(1);

    if (!cafeExists.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'Cafe not found.'
      });
    }

    const [newReview] = await db
      .insert(reviews)
      .values({
        userId,
        cafeId,
        rating,
        text,
        sentimentScore,
        entities,
        processedAt: new Date()
      })
      .returning({
        id: reviews.id,
        userId: reviews.userId,
        cafeId: reviews.cafeId,
        rating: reviews.rating,
        text: reviews.text,
        sentimentScore: reviews.sentimentScore,
        entities: reviews.entities,
        processedAt: reviews.processedAt,
        createdAt: reviews.createdAt
      });

    return reply.status(201).send({
      status: 'success',
      message: 'Review created successfully',
      data: newReview
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating review:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Get Review By ID
 */
export async function getReviewById(
  req: FastifyRequest<{ Params: { reviewId: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { reviewId } = req.params;

    const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);

    if (!review) {
      return reply.status(404).send({
        status: 'error',
        message: 'Review not found.'
      });
    }

    return reply.status(200).send({
      status: 'success',
      data: review
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching review:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Get Reviews By Cafe ID
 */
export async function getReviewsByCafeId(
  req: FastifyRequest<{ Params: { cafeId: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { cafeId } = req.params;

    const reviewsList = await db.select().from(reviews).where(eq(reviews.cafeId, cafeId));

    return reply.status(200).send({
      status: 'success',
      data: reviewsList
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching reviews:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Update Review
 */
export async function updateReview(
  req: FastifyRequest<{ Params: { reviewId: string }; Body: Partial<ReviewBody> }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { reviewId } = req.params;
    const updateData = req.body;

    const [existingReview] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (!existingReview) {
      return reply.status(404).send({
        status: 'error',
        message: 'Review not found.'
      });
    }

    const [updatedReview] = await db
      .update(reviews)
      .set(updateData)
      .where(eq(reviews.id, reviewId))
      .returning();

    return reply.status(200).send({
      status: 'success',
      message: 'Review updated successfully',
      data: updatedReview
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error updating review:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Delete Review
 */
export async function deleteReview(
  req: FastifyRequest<{ Params: { reviewId: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { reviewId } = req.params;

    const [existingReview] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (!existingReview) {
      return reply.status(404).send({
        status: 'error',
        message: 'Review not found.'
      });
    }

    await db.delete(reviews).where(eq(reviews.id, reviewId));

    return reply.status(200).send({
      status: 'success',
      message: 'Review deleted successfully'
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error deleting review:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}
