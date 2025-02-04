import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { cafes } from '@config/schemas.js';
import { eq } from 'drizzle-orm';
import { CafeParams, CafeBody, CafeSchema } from '@schemas/cafe.js';
import { sql } from 'drizzle-orm';

/**
 * Create Cafe
 */
export async function createCafe(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const data = CafeSchema.parse(req.body);

    // Create cafe with initial empty semantic embedding
    const [newCafe] = await db
      .insert(cafes)
      .values({
        name: data.name,
        description: data.description,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        ownerId: data.ownerId,
        ambiance: data.ambiance,
        dietaryOptions: data.dietaryOptions,
        location: sql<Location>`${data.location}`,
        semanticEmbedding: data.semanticEmbedding
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
  req: FastifyRequest<{ Params: CafeParams }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const cafeId = req.params.cafeId;

    // Fetch cafe details
    const cafe = await db
      .select({
        id: cafes.id,
        name: cafes.name,
        description: cafes.description,
        address: cafes.address,
        city: cafes.city,
        state: cafes.state,
        zipCode: cafes.zipCode,
        ambiance: cafes.ambiance,
        dietaryOptions: cafes.dietaryOptions,
        location: cafes.location,
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
        description: cafes.description,
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
  req: FastifyRequest<{ Params: CafeParams; Body: CafeBody }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const cafeId = req.params.cafeId;
    const {
      name,
      description,
      address,
      city,
      state,
      zipCode,
      ambiance,
      dietaryOptions,
      location,
      semanticEmbedding
    } = CafeSchema.parse(req.body);

    // Update cafe details including semantic embedding metadata
    const updatedCafe = await db
      .update(cafes)
      .set({
        name,
        description,
        address,
        city,
        state,
        zipCode,
        ambiance,
        dietaryOptions,
        location: location
          ? sql`ST_GeomFromGeoJSON(${JSON.stringify({
              type: 'Point',
              coordinates: location.coordinates
            })})`
          : null,
        semanticEmbedding: semanticEmbedding
          ? {
              vector: semanticEmbedding.vector,
              metadata: {
                type: 'cafe',
                id: semanticEmbedding.metadata.id,
                keywords: semanticEmbedding.metadata.keywords,
                createdAt: new Date(semanticEmbedding.metadata.createdAt),
                updatedAt: new Date()
              }
            }
          : null
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
  req: FastifyRequest<{ Params: CafeParams }>,
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
