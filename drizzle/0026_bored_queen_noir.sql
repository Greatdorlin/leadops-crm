ALTER TABLE "forms" ADD COLUMN "presentation_mode" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "call_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_presentation_mode_check" CHECK ("forms"."presentation_mode" in ('standard', 'step'));