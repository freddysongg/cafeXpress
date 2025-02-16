CREATE TABLE "preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"favorite_cafes" jsonb,
	"dietary_restrictions" jsonb,
	"ambiance" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "cafes" ALTER COLUMN "ambiance" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "cafes" ALTER COLUMN "dietary_options" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;