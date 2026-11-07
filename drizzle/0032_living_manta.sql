ALTER TABLE "user_credentials" ADD COLUMN "mfa_secret_cipher" text;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD COLUMN "mfa_pending_cipher" text;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD COLUMN "mfa_pending_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD COLUMN "mfa_enabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD COLUMN "mfa_last_step" integer DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD COLUMN "mfa_failed_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD COLUMN "mfa_locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD COLUMN "mfa_recovery_hashes" jsonb DEFAULT '[]'::jsonb NOT NULL;