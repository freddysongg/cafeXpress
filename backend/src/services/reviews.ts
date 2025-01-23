import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { reviews, users, cafes } from '@config/schemas';
import { eq } from 'drizzle-orm';

/**
 * Create Review
 */
export async function createReview(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { userId, cafeId, rating, description } = req.body as {
      userId: string;
      cafeId: string;
      rating: number;
      description?: string;
    };

    // Check if user exists
    const userExists = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!userExists.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'User not found.'
      });
    }

    // Check if cafe exists
    const cafeExists = await db.select().from(cafes).where(eq(cafes.id, cafeId)).limit(1);

    if (!cafeExists.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'Cafe not found.'
      });
    }

    // Create review
    const [newReview] = await db
      .insert(reviews)
      .values({
        userId,
        cafeId,
        rating,
        text: description || '', // Use description as text if provided
        sentimentScore: {
          positive: 0,
          negative: 0,
          neutral: 1,
          compound: 0
        }
      })
      .returning({
        id: reviews.id,
        userId: reviews.userId,
        cafeId: reviews.cafeId,
        rating: reviews.rating,
        description: reviews.description,
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
 * Get Review Details by ID
 */
export async function getReviewById(
  req: FastifyRequest<{ Params: { reviewId: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const reviewId = req.params.reviewId;

    // Fetch review details
    const review = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);

    if (!review.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'Review not found.'
      });
    }

    return reply.status(200).send({
      status: 'success',
      message: 'Review data retrieved',
      data: review[0]
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching review details:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Get All Reviews for a Cafe
 */
export async function getReviewsByCafeId(
  req: FastifyRequest<{ Params: { cafeId: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const cafeId = req.params.cafeId;

    // Fetch all reviews for the specified cafe
    const reviewsList = await db.select().from(reviews).where(eq(reviews.cafeId, cafeId));

    return reply.status(200).send({
      status: 'success',
      message: 'Reviews retrieved successfully',
      data: reviewsList
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching reviews for cafe:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Update Review Details
 */
export async function updateReview(
  req: FastifyRequest<{
    Params: { reviewId: string };
    Body: Partial<{ rating: number; description: string }>;
  }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const reviewId = req.params.reviewId;
    const { rating, description } = req.body;

    // Update review
    const updatedReview = await db
      .update(reviews)
      .set({ rating, description })
      .where(eq(reviews.id, reviewId))
      .returning({
        id: reviews.id,
        rating: reviews.rating,
        description: reviews.description,
        createdAt: reviews.createdAt
      });

    if (!updatedReview.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'Review not found.'
      });
    }

    return reply.status(200).send({
      status: 'success',
      message: 'Review updated successfully',
      data: updatedReview[0]
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
 * Delete a Review by ID
 */
export async function deleteReview(
  req: FastifyRequest<{ Params: { reviewId: string } }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const reviewId = req.params.reviewId;

    // Delete review
    const deletedReview = await db.delete(reviews).where(eq(reviews.id, reviewId)).returning({
      id: reviews.id,
      rating: reviews.rating,
      description: reviews.description
    });

    if (!deletedReview.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'Review not found.'
      });
    }

    return reply.status(200).send({
      status: 'success',
      message: 'Review deleted successfully',
      data: deletedReview[0]
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
