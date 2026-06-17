ALTER TYPE "public"."integration_provider" ADD VALUE 'tiktok' BEFORE 'sender';--> statement-breakpoint
ALTER TYPE "public"."integration_provider" ADD VALUE 'linkedin' BEFORE 'sender';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "external_lead_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "external_form_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_source_external_lead_id_unique" ON "leads" USING btree ("source","external_lead_id");