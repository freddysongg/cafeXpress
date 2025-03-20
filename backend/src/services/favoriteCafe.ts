import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '@config/db.js';
import { users } from '@config/schemas';
import { eq } from 'drizzle-orm';

export async function addFavoriteCafe(userId: string, cafeId: string) {
  if (!userId || !cafeId) {
    throw new Error('Missing userId or cafeId');
  }

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (user.length === 0) {
    throw new Error('User not found');
  }

  let currentFavorites = user[0].favoriteCafes || [];

  if (!currentFavorites.includes(cafeId)) {
    currentFavorites.push(cafeId);
  }

  await db.update(users).set({ favoriteCafes: currentFavorites }).where(eq(users.id, userId));

  return currentFavorites;
}

export async function removeFavoriteCafe(userId: string, cafeId: string) {
  if (!userId || !cafeId) {
    throw new Error('Missing userId or cafeId');
  }

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (user.length === 0) {
    throw new Error('User not found');
  }

  let currentFavorites = user[0].favoriteCafes || [];
  const updatedFavorites = currentFavorites.filter((id) => id !== cafeId);

  await db.update(users).set({ favoriteCafes: updatedFavorites }).where(eq(users.id, userId));

  return updatedFavorites;
}

export async function isFavorited(userId: string, cafeId: string): Promise<boolean> {
  try {
    // Fetch the user's favorite_cafes column
    const user = await db
      .select({ favoriteCafes: users.favoriteCafes })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // If the user doesn't exist or favorite_cafes is null/undefined, return false
    if (!user.length || !user[0].favoriteCafes) {
      return false;
    }

    // Check if the cafeId exists in the favorite_cafes array
    return user[0].favoriteCafes.includes(cafeId);
  } catch (error) {
    console.error('Error checking if cafe is favorited:', error);
    return false;
  }
}
