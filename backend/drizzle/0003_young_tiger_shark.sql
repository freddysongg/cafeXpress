ALTER TABLE "preferences" ADD COLUMN "preferences" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "recent_searches" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "preferences" DROP COLUMN "favorite_cafes";--> statement-breakpoint
ALTER TABLE "preferences" DROP COLUMN "dietary_restrictions";--> statement-breakpoint
ALTER TABLE "preferences" DROP COLUMN "ambiance";