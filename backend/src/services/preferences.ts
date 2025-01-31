import { FastifyRequest, FastifyReply } from 'fastify';
import { PreferencesSchema, CreatePreferencesSchema } from '@schemas/preferences.js';
import { sql } from 'drizzle-orm';
import { db } from '@config/db.js';
import { preferences } from '@config/schemas.js';
import { eq } from 'drizzle-orm';

export async function createPreferences(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const data: PreferencesSchema = CreatePreferencesSchema.parse(req.body);

    const semanticEmbedding = data.semanticEmbedding
      ? sql`${JSON.stringify(data.semanticEmbedding)}`
      : null;

    const [newPreferences] = await db
      .insert(preferences)
      .values({
        userId: data.userId,
        favoriteCafes: data.favoriteCafes,
        dietaryRestrictions: data.dietaryRestrictions,
        ambiance: data.ambiance,
        semanticEmbedding
      })
      .returning({
        id: preferences.id,
        userId: preferences.userId,
        favoriteCafes: preferences.favoriteCafes,
        dietaryRestrictions: preferences.dietaryRestrictions,
        ambiance: preferences.ambiance,
        semanticEmbedding: preferences.semanticEmbedding,
        createdAt: preferences.createdAt
      });

    return reply.status(200).send({
      status: 'success',
      message: 'Preferences created successfully',
      data: newPreferences
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating preferences:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Get Preferences by User ID
 */
export async function getPreferencesByUserId(
  req: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = req.params.userId;

    const userPreferences = await db
      .select({
        favoriteCafes: preferences.favoriteCafes,
        dietaryRestrictions: preferences.dietaryRestrictions,
        ambiance: preferences.ambiance,
        semanticEmbedding: preferences.semanticEmbedding,
        createdAt: preferences.createdAt
      })
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .limit(1);

    if (!userPreferences.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'Preferences not found.'
      });
    }

    return reply.status(200).send({
      status: 'success',
      message: 'Preferences retrieved successfully',
      data: userPreferences[0]
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching preferences:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Get All Preferences
 */
export async function getAllPreferences(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const preferencesList = await db
      .select({
        id: preferences.id,
        userId: preferences.userId,
        favoriteCafes: preferences.favoriteCafes,
        dietaryRestrictions: preferences.dietaryRestrictions,
        ambiance: preferences.ambiance,
        semanticEmbedding: preferences.semanticEmbedding,
        createdAt: preferences.createdAt
      })
      .from(preferences);

    return reply.status(200).send({
      status: 'success',
      message: 'Preferences data retrieved',
      data: preferencesList
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching preferences:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Update Preferences for a User
 */
export async function updatePreferences(
  req: FastifyRequest<{
    Params: { userId: string };
    Body: Partial<{
      favoriteCafes: string[];
      dietaryRestrictions: string[];
      ambiance: string[];
      semanticEmbedding: typeof preferences.semanticEmbedding;
    }>;
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = req.params.userId;
    const { favoriteCafes, dietaryRestrictions, ambiance, semanticEmbedding } = req.body;

    const updatedPreferences = await db
      .update(preferences)
      .set({ favoriteCafes, dietaryRestrictions, ambiance, semanticEmbedding })
      .where(eq(preferences.userId, userId))
      .returning({
        id: preferences.id,
        userId: preferences.userId,
        favoriteCafes: preferences.favoriteCafes,
        dietaryRestrictions: preferences.dietaryRestrictions,
        ambiance: preferences.ambiance,
        semanticEmbedding: preferences.semanticEmbedding,
        createdAt: preferences.createdAt
      });

    if (!updatedPreferences.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'Preferences not found.'
      });
    }

    return reply.status(200).send({
      status: 'success',
      message: 'Preferences updated successfully',
      data: updatedPreferences[0]
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error updating preferences:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}

/**
 * Delete Preferences by User ID
 */
export async function deletePreferences(
  req: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = req.params.userId;

    const deletedPreferences = await db
      .delete(preferences)
      .where(eq(preferences.userId, userId))
      .returning({
        id: preferences.id,
        userId: preferences.userId,
        favoriteCafes: preferences.favoriteCafes,
        dietaryRestrictions: preferences.dietaryRestrictions,
        ambiance: preferences.ambiance,
        semanticEmbedding: preferences.semanticEmbedding,
        createdAt: preferences.createdAt
      });

    if (!deletedPreferences.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'Preferences not found.'
      });
    }

    return reply.status(200).send({
      status: 'success',
      message: 'Preferences deleted successfully',
      data: deletedPreferences[0]
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error deleting preferences:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message
    });
  }
}
