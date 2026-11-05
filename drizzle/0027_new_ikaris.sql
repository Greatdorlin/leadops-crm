ALTER TABLE "forms" ALTER COLUMN "is_active" SET DEFAULT false;--> statement-breakpoint
-- Align the historical database default with the existing inactive-user schema.
-- Existing user rows and explicit upsert activation choices are preserved.
ALTER TABLE "crm_users" ALTER COLUMN "is_active" SET DEFAULT false;
