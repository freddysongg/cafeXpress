import {
  pgTable,
  varchar,
  timestamp,
  uuid,
  serial,
  text,
  jsonb,
  integer
} from 'drizzle-orm/pg-core';

const defaults = {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow()
};

export const test = pgTable('test', {
  ...defaults,
  test1: varchar('test1', { length: 100 }).notNull(),
  test2: varchar('test2', { length: 255 }).unique().notNull()
});

// Users Table
export const users = pgTable('users', {
  ...defaults,
  username: varchar('username', { length: 50 }).notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  email: varchar('email', { length: 100 }).notNull().unique(),
  phone: varchar('phone', { length: 15 }),
  password: text('password').notNull(),
  description: text('description')
});

// Cafes Table
export const cafes = pgTable('cafes', {
  ...defaults,
  name: varchar('name', { length: 100 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 50 }).notNull(),
  state: varchar('state', { length: 50 }).notNull(),
  zipCode: varchar('zip_code', { length: 10 }).notNull(),
  ownerId: uuid('owner_id')
    .references(() => users.id)
    .notNull(),
  ambiance: jsonb('ambiance').default('{}'), // Example: {"quiet": true, "family_friendly": false}
  dietaryOptions: jsonb('dietary_options').default('{}') // Example: {"vegan": true, "gluten_free": false}
});

// Reviews Table
export const reviews = pgTable('reviews', {
  ...defaults,
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  cafeId: uuid('cafe_id')
    .references(() => cafes.id)
    .notNull(),
  rating: integer('rating').notNull(),
  description: text('description')
});

// Preferences Table
export const preferences = pgTable('preferences', {
  ...defaults,
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  favoriteCafes: jsonb('favorite_cafes').default('[]'), // Example: [{"cafe_id": "uuid1"}, {"cafe_id": "uuid2"}]
  dietaryRestrictions: jsonb('dietary_restrictions').default('{}'), // Example: {"vegan": true, "halal": false}
  ambiance: jsonb('ambiance').default('{}') // Example: {"quiet": true, "family_friendly": false}
});

// Business Insights Table
export const businessInsights = pgTable('business_insights', {
  ...defaults,
  cafeId: uuid('cafe_id')
    .references(() => cafes.id)
    .notNull(),
  visits: integer('visits').default(0),
  averageRating: integer('average_rating').default(0),
  peakHours: jsonb('peak_hours').default('{}'), // Example: {"monday": "12:00-14:00", "friday": "18:00-20:00"}
  sentimentAnalysis: jsonb('sentiment_analysis').default('{}') // Example: {"positive": 60, "negative": 40}
});
