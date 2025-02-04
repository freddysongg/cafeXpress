DROP INDEX "unique_address";--> statement-breakpoint
ALTER TABLE "cafes" ADD CONSTRAINT "cafes_address_unique" UNIQUE("address");