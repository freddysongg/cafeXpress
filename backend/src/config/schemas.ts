import { pgTable, serial, varchar, numeric, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});