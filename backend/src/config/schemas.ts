import { pgTable, uuid, text, jsonb, timestamp, varchar } from 'drizzle-orm/pg-core';
import { EmbeddingSchema } from '@schemas/semantic.js';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  password: text('password').notNull(),
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
  createdAt: timestamp('created_at').defaultNow(),
  name: text('name').notNull(),
  description: text('description'),
  address: text('address').notNull().unique(),
  city: varchar('city', { length: 50 }).notNull(),
  state: varchar('state', { length: 50 }).notNull(),
  zipCode: varchar('zip_code', { length: 10 }).notNull(),
  ambiance: jsonb('ambiance').default('{}'), // Example: {"quiet": true, "family_friendly": false}
  dietaryOptions: jsonb('dietary_options').default('{}'), // Example: {"vegan": true, "gluten_free": false}
  location: jsonb('location').$type<{ type: string; coordinates: number[] }>(),
  semanticEmbedding: jsonb('semantic_embedding').$type<{
    vector: number[];
    metadata: {
      type: 'cafe';
      id: string;
      keywords: string[];
      createdAt: Date;
      updatedAt: Date;
    };
  }>(),
  keywords: jsonb('keywords').$type<string[]>().default([])
});

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  cafeId: uuid('cafe_id').references(() => cafes.id),
  userId: uuid('user_id').references(() => users.id),
  rating: jsonb('rating').$type<number>().notNull(),
  description: text('description'),
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
