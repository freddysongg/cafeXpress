import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { preferences } from '@config/schemas';
import { eq } from 'drizzle-orm';

/**
 * Create Preferences for a User
 */
export async function createPreferences(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { userId, favoriteCafes, dietaryRestrictions, ambiance } = req.body as {
      userId: string;
      favoriteCafes: any; // Assuming it's an array of objects
      dietaryRestrictions: any; // Assuming it's an object
      ambiance: any; // Assuming it's an object
    };

    // Create preferences
    const [newPreferences] = await db
      .insert(preferences)
      .values({ userId, favoriteCafes, dietaryRestrictions, ambiance })
      .returning({
        id: preferences.id,
        userId: preferences.userId,
        favoriteCafes: preferences.favoriteCafes,
        dietaryRestrictions: preferences.dietaryRestrictions,
        ambiance: preferences.ambiance,
      });

    return reply.status(200).send({
      status: 'success',
      message: 'Preferences created successfully',
      data: newPreferences,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error creating preferences:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message,
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

    // Fetch preferences
    const userPreferences = await db
      .select({
        favoriteCafes: preferences.favoriteCafes,
        dietaryRestrictions: preferences.dietaryRestrictions,
        ambiance: preferences.ambiance,
      })
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .limit(1);

    if (!userPreferences.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'Preferences not found.',
      });
    }

    return reply.status(200).send({
      status: 'success',
      message: 'Preferences retrieved successfully',
      data: userPreferences[0],
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching preferences:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message,
    });
  }
}

/**
 * Get All Preferences
 */
export async function getAllPreferences(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Fetch all preferences
    const preferencesList = await db
      .select({
        id: preferences.id,
        userId: preferences.userId,
        favoriteCafes: preferences.favoriteCafes,
        dietaryRestrictions: preferences.dietaryRestrictions,
        ambiance: preferences.ambiance,
      })
      .from(preferences);

    return reply.status(200).send({
      status: 'success',
      message: 'Preferences data retrieved',
      data: preferencesList,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching preferences:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message,
    });
  }
}

/**
 * Update Preferences for a User
 */
export async function updatePreferences(
  req: FastifyRequest<{ Params: { userId: string }; Body: Partial<{ favoriteCafes: any; dietaryRestrictions: any; ambiance: any }> }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = req.params.userId;
    const { favoriteCafes, dietaryRestrictions, ambiance } = req.body;

    // Update preferences
    const updatedPreferences = await db
      .update(preferences)
      .set({ favoriteCafes, dietaryRestrictions, ambiance })
      .where(eq(preferences.userId, userId))
      .returning({
        id: preferences.id,
        userId: preferences.userId,
        favoriteCafes: preferences.favoriteCafes,
        dietaryRestrictions: preferences.dietaryRestrictions,
        ambiance: preferences.ambiance,
      });

    if (!updatedPreferences.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'Preferences not found.',
      });
    }

    return reply.status(200).send({
      status: 'success',
      message: 'Preferences updated successfully',
      data: updatedPreferences[0],
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error updating preferences:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message,
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

    // Delete preferences
    const deletedPreferences = await db
      .delete(preferences)
      .where(eq(preferences.userId, userId))
      .returning({
        id: preferences.id,
        userId: preferences.userId,
        favoriteCafes: preferences.favoriteCafes,
        dietaryRestrictions: preferences.dietaryRestrictions,
        ambiance: preferences.ambiance,
      });

    if (!deletedPreferences.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'Preferences not found.',
      });
    }

    return reply.status(200).send({
      status: 'success',
      message: 'Preferences deleted successfully',
      data: deletedPreferences[0],
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error deleting preferences:', err.message);
    return reply.status(500).send({
      status: 'error',
      message: err.message,
    });
  }
}
