ALTER TABLE "leads" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "deleted_by" text;--> statement-breakpoint
CREATE INDEX "leads_deleted_at_idx" ON "leads" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "leads_state_idx" ON "leads" USING btree ("state");