import { FastifyRequest, FastifyReply } from 'fastify';
import {
  PreferencesSchema,
  PreferencesType,
  UpdatePreferencesSchema
} from '@schemas/preferences.js';
import { db } from '@config/db.js';
import { preferences, users } from '@config/schemas.js';
import { eq } from 'drizzle-orm';

export async function createPreferences(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const data = PreferencesSchema.parse(req.body) as PreferencesType;

    const [newPreferences] = await db
      .insert(preferences)
      .values({
        userId: data.userId,
        preferences: data.preferences
      })
      .returning({
        id: preferences.id,
        userId: preferences.userId,
        preferences: preferences.preferences,
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
        id: preferences.id,
        userId: preferences.userId,
        preferences: preferences.preferences,
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
        preferences: preferences.preferences,
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
    Body: {
      preferences: {
        dietary: string[];
        ambiance: string[];
        activities: string[];
        drinks: string[];
        vibes: string[];
        coffee: string[];
      };
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = req.params.userId;
    const { preferences: newPreferences } = req.body;

    const updatedPreferences = await db
      .update(preferences)
      .set({ preferences: newPreferences })
      .where(eq(preferences.userId, userId))
      .returning({
        id: preferences.id,
        userId: preferences.userId,
        preferences: preferences.preferences,
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
        preferences: preferences.preferences,
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

export async function updateUserPreferences(
  req: FastifyRequest<{
    Body: {
      preferences: {
        dietary: string[];
        ambiance: string[];
        activities: string[];
        drinks: string[];
        vibes: string[];
        coffee: string[];
      };
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return reply.status(401).send({
        status: 'error',
        message: 'User ID not found in token'
      });
    }

    const data = UpdatePreferencesSchema.parse(req.body);

    const updatedUser = await db
      .update(users)
      .set({
        preferences: data.preferences,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        preferences: users.preferences,
        updatedAt: users.updatedAt
      });

    if (!updatedUser.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'User not found.'
      });
    }

    return reply.status(200).send({
      status: 'success',
      message: 'Preferences updated successfully',
      data: updatedUser[0]
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

export async function getUserPreferences(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return reply.status(401).send({
        status: 'error',
        message: 'User ID not found in token'
      });
    }

    const userPreferences = await db
      .select({
        preferences: users.preferences
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userPreferences.length) {
      return reply.status(404).send({
        status: 'error',
        message: 'User not found.'
      });
    }

    const defaultPreferences = {
      dietary: [] as string[],
      ambiance: [] as string[],
      activities: [] as string[],
      drinks: [] as string[],
      vibes: [] as string[],
      coffee: [] as string[]
    };

    // Use type assertion to match the database schema
    const preferences =
      (userPreferences[0].preferences as typeof defaultPreferences) || defaultPreferences;

    return reply.status(200).send({
      status: 'success',
      message: 'Preferences retrieved successfully',
      data: {
        dietary: preferences.dietary || defaultPreferences.dietary,
        ambiance: preferences.ambiance || defaultPreferences.ambiance,
        activities: preferences.activities || defaultPreferences.activities,
        drinks: preferences.drinks || defaultPreferences.drinks,
        vibes: preferences.vibes || defaultPreferences.vibes,
        coffee: preferences.coffee || defaultPreferences.coffee
      }
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
