CREATE TABLE "cafes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"name" text NOT NULL,
	"description" text,
	"address" text NOT NULL,
	"city" varchar(50) NOT NULL,
	"state" varchar(50) NOT NULL,
	"zip_code" varchar(10) NOT NULL,
	"ambiance" jsonb DEFAULT '{}'::jsonb,
	"dietary_options" jsonb DEFAULT '{}'::jsonb,
	"location" jsonb,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"photos" jsonb DEFAULT '[]'::jsonb,
	"hours" jsonb DEFAULT '[]'::jsonb,
	"rating" numeric(2, 2) DEFAULT 4.5,
	"status" varchar(20) DEFAULT 'open',
	"num_of_ratings" integer DEFAULT 0,
	CONSTRAINT "cafes_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"favorite_cafes" jsonb,
	"dietary_restrictions" jsonb,
	"ambiance" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cafe_id" uuid,
	"user_id" uuid,
	"rating" jsonb NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"password" text NOT NULL,
	"description" text,
	"location" jsonb,
	"preferences" jsonb,
	"favorite_cafes" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;