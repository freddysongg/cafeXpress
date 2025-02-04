CREATE TABLE "cafes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"name" text NOT NULL,
	"description" text,
	"address" text NOT NULL,
	"city" varchar(50) NOT NULL,
	"state" varchar(50) NOT NULL,
	"zip_code" varchar(10) NOT NULL,
	"ambiance" jsonb DEFAULT '{}',
	"dietary_options" jsonb DEFAULT '{}',
	"location" jsonb,
	"semantic_embedding" jsonb,
	"keywords" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"favorite_cafes" jsonb,
	"dietary_restrictions" jsonb,
	"ambiance" jsonb,
	"semantic_embedding" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cafe_id" uuid,
	"user_id" uuid,
	"rating" jsonb NOT NULL,
	"description" text,
	"comment" text,
	"text" text NOT NULL,
	"sentiment_score" jsonb NOT NULL,
	"entities" jsonb,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"password" text NOT NULL,
	"description" text,
	"location" jsonb,
	"preferences_embedding" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_address" ON "cafes" USING btree ("address");
ALTER TABLE "cafes" ADD CONSTRAINT "unique_address" UNIQUE (address);
