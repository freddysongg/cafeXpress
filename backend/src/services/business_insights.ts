import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { businessInsights } from '@config/schemas';
import { eq } from 'drizzle-orm';

/**
 * Create Business Insight
 */
export async function createBusinessInsight(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { cafeId, visits, averageRating, peakHours, sentimentAnalysis } = req.body as {
      cafeId: string;
      visits?: number;
      averageRating?: number;
      peakHours?: object;
      sentimentAnalysis?: object;
    };

    // Create business insight
    const [newBusinessInsight] = await db
      .insert(businessInsights)
      .values({
        cafeId,
        visits: visits || 0,
        averageRating: averageRating || 0,
        peakHours: peakHours || {},
        sentimentAnalysis: sentimentAnalysis || {}
      })
      .returning({
        id: businessInsights.id,
        cafeId: businessInsights.cafeId,
        visits: businessInsights.visits,
        averageRating: businessInsights.averageRating,
        peakHours: businessInsights.peakHours,
        sentimentAnalysis: businessInsights.sentimentAnalysis
      });

    reply.status(201).send({
      status: 'success',
      message: 'Business insight created successfully',
      data: newBusinessInsight
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating business insight:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Get Business Insight by Cafe ID
 */
export async function getBusinessInsightByCafeId(
  req: FastifyRequest<{ Params: { cafeId: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { cafeId } = req.params;

    // Fetch business insight by cafeId
    const insight = await db
      .select({
        cafeId: businessInsights.cafeId,
        visits: businessInsights.visits,
        averageRating: businessInsights.averageRating,
        peakHours: businessInsights.peakHours,
        sentimentAnalysis: businessInsights.sentimentAnalysis
      })
      .from(businessInsights)
      .where(eq(businessInsights.cafeId, cafeId))
      .limit(1);

    if (!insight.length) {
      reply.status(404).send({
        status: 'error',
        message: 'Business insight not found.'
      });
      return;
    }

    reply.status(200).send({
      status: 'success',
      message: 'Business insight data retrieved',
      data: insight[0]
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching business insight:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Get All Business Insights
 */
export async function getAllBusinessInsights(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Fetch all business insights
    const insights = await db
      .select({
        id: businessInsights.id,
        cafeId: businessInsights.cafeId,
        visits: businessInsights.visits,
        averageRating: businessInsights.averageRating,
        peakHours: businessInsights.peakHours,
        sentimentAnalysis: businessInsights.sentimentAnalysis
      })
      .from(businessInsights);

    reply.status(200).send({
      status: 'success',
      message: 'Business insights data retrieved',
      data: insights
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching business insights:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Update Business Insight
 */
export async function updateBusinessInsight(
  req: FastifyRequest<{
    Params: { cafeId: string };
    Body: Partial<{
      visits: number;
      averageRating: number;
      peakHours: object;
      sentimentAnalysis: object;
    }>;
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { cafeId } = req.params;
    const { visits, averageRating, peakHours, sentimentAnalysis } = req.body;

    // Update business insight
    const updatedInsight = await db
      .update(businessInsights)
      .set({ visits, averageRating, peakHours, sentimentAnalysis })
      .where(eq(businessInsights.cafeId, cafeId))
      .returning({
        id: businessInsights.id,
        cafeId: businessInsights.cafeId,
        visits: businessInsights.visits,
        averageRating: businessInsights.averageRating,
        peakHours: businessInsights.peakHours,
        sentimentAnalysis: businessInsights.sentimentAnalysis
      });

    if (!updatedInsight.length) {
      reply.status(404).send({
        status: 'error',
        message: 'Business insight not found.'
      });
      return;
    }

    reply.status(200).send({
      status: 'success',
      message: 'Business insight updated successfully',
      data: updatedInsight[0]
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error updating business insight:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Delete Business Insight by Cafe ID
 */
export async function deleteBusinessInsight(
  req: FastifyRequest<{ Params: { cafeId: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { cafeId } = req.params;

    // Delete business insight by cafeId
    const deletedInsight = await db
      .delete(businessInsights)
      .where(eq(businessInsights.cafeId, cafeId))
      .returning({
        id: businessInsights.id,
        cafeId: businessInsights.cafeId,
        visits: businessInsights.visits,
        averageRating: businessInsights.averageRating
      });

    if (!deletedInsight.length) {
      reply.status(404).send({
        status: 'error',
        message: 'Business insight not found.'
      });
      return;
    }

    reply.status(200).send({
      status: 'success',
      message: 'Business insight deleted successfully',
      data: deletedInsight[0]
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error deleting business insight:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}
