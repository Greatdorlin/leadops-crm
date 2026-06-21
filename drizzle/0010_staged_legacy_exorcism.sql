-- Phase 1 draft migration: execute only after the runtime cleanup lands.
-- This file captures the intended destructive schema change set requested for
-- Leads Desk v1.0 release cleanup.

ALTER TABLE "crm_users" ADD COLUMN IF NOT EXISTS "avatar_url" text;

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "region" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "postal_code" text;

ALTER TABLE "leads" ALTER COLUMN "source" SET DEFAULT 'manual_entry';

DROP INDEX IF EXISTS "leads_report_token_unique";
DROP INDEX IF EXISTS "leads_completion_status_idx";
DROP INDEX IF EXISTS "leads_crm_status_idx";
DROP INDEX IF EXISTS "leads_primary_goal_idx";

ALTER TABLE "leads" DROP COLUMN IF EXISTS "report_token";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "completion_status";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "crm_status";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "primary_goal";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "current_step_key";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "current_step_index";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "progress_percent";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "readiness_level";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "top_pathway_title";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "answers";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "report";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "public_report";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "analytics";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "sync";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "completed_at";

DROP TYPE IF EXISTS "completion_status";
DROP TYPE IF EXISTS "primary_goal";
DROP TYPE IF EXISTS "crm_status";
