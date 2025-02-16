import { pgTable, uuid, text, jsonb, timestamp, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: text('role').notNull().default('user'),
  username: text('username').notNull(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  password: text('password').notNull(),
  description: text('description'),
  location: jsonb('location').$type<{
    type: 'Point';
    coordinates: [number, number];
  }>(),
  preferences: jsonb('preferences').$type<{
    dietary: string[];
    ambiance: string[];
    activities: string[];
  }>(),
  favoriteCafes: jsonb('favorite_cafes').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const preferences = pgTable('preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  favoriteCafes: jsonb('favorite_cafes').$type<string[]>(),
  dietaryRestrictions: jsonb('dietary_restrictions').$type<string[]>(),
  ambiance: jsonb('ambiance').$type<string[]>(),
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
  ambiance: jsonb('ambiance')
    .$type<Record<string, boolean>>()
    .default(sql`'{}'::jsonb`),
  dietaryOptions: jsonb('dietary_options')
    .$type<Record<string, boolean>>()
    .default(sql`'{}'::jsonb`),
  location: jsonb('location').$type<{
    type: 'Point';
    coordinates: [number, number];
  }>(),
  keywords: jsonb('keywords')
    .$type<string[]>()
    .default(sql`'[]'::jsonb`),
  photos: jsonb('photos')
    .$type<string[]>()
    .default(sql`'[]'::jsonb`),
  hours: jsonb('hours')
    .$type<
      {
        day: string;
        open: string;
        close: string;
      }[]
    >()
    .default(sql`'[]'::jsonb`)
});

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  cafeId: uuid('cafe_id').references(() => cafes.id),
  userId: uuid('user_id').references(() => users.id),
  rating: jsonb('rating').$type<number>().notNull(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow()
});
