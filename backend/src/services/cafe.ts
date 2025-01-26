import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { cafes } from '@config/schemas.js';
import { eq } from 'drizzle-orm';

/**
 * Create Cafe
 */
export async function createCafe(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { name, address, city, state, zipCode, ownerId, ambiance, dietaryOptions, keywords } =
      req.body as {
        name: string;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        ownerId: string;
        ambiance?: object;
        dietaryOptions?: object;
        keywords?: string[];
      };

    // Create cafe with initial empty semantic embedding
    const [newCafe] = await db
      .insert(cafes)
      .values({
        name,
        address,
        city,
        state,
        zipCode,
        ownerId,
        ambiance,
        dietaryOptions,
        keywords: keywords || [],
        semanticEmbedding: {
          vector: [],
          metadata: {
            type: 'cafe',
            id: '',
            keywords: keywords || [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      })
      .returning({
        id: cafes.id,
        name: cafes.name,
        city: cafes.city,
        state: cafes.state,
        createdAt: cafes.createdAt
      });

    reply.status(200).send({
      status: 'success',
      message: 'Cafe created successfully',
      data: newCafe
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating cafe:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Get Cafe by ID
 */
export async function getCafeById(
  req: FastifyRequest<{ Params: { cafeId: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const cafeId = req.params.cafeId;

    // Fetch cafe details
    const cafe = await db
      .select({
        id: cafes.id,
        name: cafes.name,
        address: cafes.address,
        city: cafes.city,
        state: cafes.state,
        zipCode: cafes.zipCode,
        ambiance: cafes.ambiance,
        dietaryOptions: cafes.dietaryOptions,
        keywords: cafes.keywords,
        semanticEmbedding: cafes.semanticEmbedding,
        createdAt: cafes.createdAt
      })
      .from(cafes)
      .where(eq(cafes.id, cafeId))
      .limit(1);

    if (!cafe.length) {
      reply.status(404).send({
        status: 'error',
        message: 'Cafe not found.'
      });
      return;
    }

    reply.status(200).send({
      status: 'success',
      message: 'Cafe data retrieved',
      data: cafe[0]
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching cafe details:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Get All Cafes
 */
export async function getAllCafes(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Fetch all cafes
    const cafesList = await db
      .select({
        id: cafes.id,
        name: cafes.name,
        city: cafes.city,
        state: cafes.state,
        zipCode: cafes.zipCode,
        createdAt: cafes.createdAt
      })
      .from(cafes);

    reply.status(200).send({
      status: 'success',
      message: 'Cafes data retrieved',
      data: cafesList
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching cafes:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Update Cafe
 */
export async function updateCafe(
  req: FastifyRequest<{
    Params: { cafeId: string };
    Body: Partial<{
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      ambiance: object;
      dietaryOptions: object;
      keywords?: string[];
    }>;
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const cafeId = req.params.cafeId;
    const { name, address, city, state, zipCode, ambiance, dietaryOptions, keywords } = req.body;

    // Update cafe details including semantic embedding metadata
    const updatedCafe = await db
      .update(cafes)
      .set({
        name,
        address,
        city,
        state,
        zipCode,
        ambiance,
        dietaryOptions,
        keywords,
        semanticEmbedding: {
          vector: [],
          metadata: {
            type: 'cafe',
            id: req.params.cafeId,
            keywords: keywords || [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      })
      .where(eq(cafes.id, cafeId))
      .returning({
        id: cafes.id,
        name: cafes.name,
        city: cafes.city,
        state: cafes.state,
        zipCode: cafes.zipCode
      });

    if (!updatedCafe.length) {
      reply.status(404).send({
        status: 'error',
        message: 'Cafe not found.'
      });
      return;
    }

    reply.status(200).send({
      status: 'success',
      message: 'Cafe updated successfully',
      data: updatedCafe[0]
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error updating cafe:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Delete Cafe by ID
 */
export async function deleteCafe(
  req: FastifyRequest<{ Params: { cafeId: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const cafeId = req.params.cafeId;

    // Delete cafe
    const deletedCafe = await db.delete(cafes).where(eq(cafes.id, cafeId)).returning({
      id: cafes.id,
      name: cafes.name,
      city: cafes.city,
      state: cafes.state
    });

    if (!deletedCafe.length) {
      reply.status(404).send({
        status: 'error',
        message: 'Cafe not found.'
      });
      return;
    }

    reply.status(200).send({
      status: 'success',
      message: 'Cafe deleted successfully',
      data: deletedCafe[0]
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error deleting cafe:', err.message);
    reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}
