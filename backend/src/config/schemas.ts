import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { EmbeddingSchema } from '@schemas/semantic.js';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull(),
  description: text('description'),
  location: jsonb('location').$type<Location>(),
  preferencesEmbedding: jsonb('preferences_embedding').$type<{
    vector: number[];
    metadata: {
      type: 'user' | 'preferences' | 'cafe';
      id: string;
      createdAt?: Date;
    };
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const preferences = pgTable('preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  favoriteCafes: jsonb('favorite_cafes').$type<string[]>(),
  dietaryRestrictions: jsonb('dietary_restrictions').$type<string[]>(),
  ambiance: jsonb('ambiance').$type<string[]>(),
  semanticEmbedding: jsonb('semantic_embedding').$type<typeof EmbeddingSchema>(),
  createdAt: timestamp('created_at').defaultNow()
});

export const cafes = pgTable('cafes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  city: text('city'),
  state: text('state'),
  description: text('description'),
  location: jsonb('location').$type<{ type: string; coordinates: number[] }>(),
  semanticEmbedding: jsonb('semantic_embedding').$type<number[]>(),
  createdAt: timestamp('created_at').defaultNow()
});

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  cafeId: uuid('cafe_id').references(() => cafes.id),
  userId: uuid('user_id').references(() => users.id),
  rating: text('rating').notNull(),
  comment: text('comment'),
  text: text('text').notNull(), // Required text field for raw review text
  sentimentScore: jsonb('sentiment_score')
    .$type<{
      positive: number;
      negative: number;
      neutral: number;
      compound: number;
    }>()
    .notNull(),
  entities: jsonb('entities').$type<
    Array<{
      name: string;
      type: string;
      salience: number;
      sentiment?: 'positive' | 'negative' | 'neutral';
    }>
  >(),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow()
});
