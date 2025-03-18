import { relations } from 'drizzle-orm/relations';
import { users, preferences, cafes, reviews } from './schema';

export const preferencesRelations = relations(preferences, ({ one }) => ({
  user: one(users, {
    fields: [preferences.userId],
    references: [users.id]
  })
}));

export const usersRelations = relations(users, ({ many }) => ({
  preferences: many(preferences),
  reviews: many(reviews)
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  cafe: one(cafes, {
    fields: [reviews.cafeId],
    references: [cafes.id]
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id]
  })
}));

export const cafesRelations = relations(cafes, ({ many }) => ({
  reviews: many(reviews)
}));
