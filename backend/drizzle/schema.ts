import { pgTable, foreignKey, uuid, jsonb, timestamp, text, unique, varchar, numeric, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const preferences = pgTable("preferences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	preferences: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "preferences_user_id_users_id_fk"
		}),
]);

export const reviews = pgTable("reviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	cafeId: uuid("cafe_id"),
	userId: uuid("user_id"),
	rating: jsonb().notNull(),
	title: text(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.cafeId],
			foreignColumns: [cafes.id],
			name: "reviews_cafe_id_cafes_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "reviews_user_id_users_id_fk"
		}),
]);

export const cafes = pgTable("cafes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	name: text().notNull(),
	description: text(),
	address: text().notNull(),
	city: varchar({ length: 50 }).notNull(),
	state: varchar({ length: 50 }).notNull(),
	zipCode: varchar("zip_code", { length: 10 }).notNull(),
	ambiance: jsonb().default({}),
	dietaryOptions: jsonb("dietary_options").default({}),
	location: jsonb(),
	keywords: jsonb().default([]),
	photos: jsonb().default([]),
	hours: jsonb().default([]),
	rating: numeric({ precision: 4, scale:  2 }).default('4.5'),
	status: varchar({ length: 20 }).default('open'),
	numOfRatings: integer("num_of_ratings").default(0),
	phone: text(),
}, (table) => [
	unique("cafes_address_unique").on(table.address),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	role: text().default('user').notNull(),
	username: text().notNull(),
	email: text().notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	phone: text(),
	password: text().notNull(),
	description: text(),
	location: jsonb(),
	preferences: jsonb(),
	favoriteCafes: jsonb("favorite_cafes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	recentSearches: jsonb("recent_searches").default([]),
});
