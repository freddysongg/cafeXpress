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
