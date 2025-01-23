ALTER TABLE "cafes" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "semantic_embedding" jsonb;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "location" jsonb DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "text" text NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "sentiment_score" integer;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "processed_at" timestamp;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "entities" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" jsonb DEFAULT '{}';