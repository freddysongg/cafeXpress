import { pgTable, varchar, timestamp, uuid } from 'drizzle-orm/pg-core';

export const test = pgTable('test', {
  id: uuid('id').primaryKey().defaultRandom(),
  test1: varchar('test1', { length: 100 }).notNull(),
  test2: varchar('test2', { length: 255 }).unique().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});
