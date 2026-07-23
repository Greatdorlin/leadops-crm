ALTER TABLE "company_settings" ADD COLUMN "onboarding_profile" jsonb;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "company_settings"
SET "onboarding_completed_at" = COALESCE("onboarding_completed_at", now());
