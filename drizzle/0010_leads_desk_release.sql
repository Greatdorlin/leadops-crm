-- Leads Desk release migration.
-- Archives inherited payloads before removing obsolete columns so upgrades are loss-aware.

CREATE TABLE IF NOT EXISTS "migration_archives" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_system" text NOT NULL,
  "record_type" text NOT NULL,
  "source_record_id" text NOT NULL,
  "payload" jsonb NOT NULL,
  "migrated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "migration_archives_source_record_unique"
  ON "migration_archives" ("source_system", "record_type", "source_record_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_archives_source_system_idx"
  ON "migration_archives" ("source_system");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "migration_archives_migrated_at_idx"
  ON "migration_archives" ("migrated_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "data_imports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_system" text NOT NULL,
  "source_file_name" text,
  "source_file_sha256" text,
  "status" text DEFAULT 'staged' NOT NULL,
  "mode" text DEFAULT 'validate' NOT NULL,
  "field_mapping" jsonb,
  "summary" jsonb,
  "created_by" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "rolled_back_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_import_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "import_id" uuid NOT NULL,
  "row_number" integer NOT NULL,
  "object_type" text DEFAULT 'lead' NOT NULL,
  "source_record_id" text,
  "source_updated_at" timestamp with time zone,
  "status" text DEFAULT 'pending' NOT NULL,
  "checksum" text NOT NULL,
  "raw_payload" jsonb NOT NULL,
  "normalized_payload" jsonb,
  "previous_lead_snapshot" jsonb,
  "result_action" text,
  "lead_id" uuid,
  "error_code" text,
  "error_message" text,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "data_import_records" DROP CONSTRAINT IF EXISTS "data_import_records_import_id_data_imports_id_fk";
--> statement-breakpoint
ALTER TABLE "data_import_records" ADD CONSTRAINT "data_import_records_import_id_data_imports_id_fk"
  FOREIGN KEY ("import_id") REFERENCES "public"."data_imports"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "data_import_records" DROP CONSTRAINT IF EXISTS "data_import_records_lead_id_leads_id_fk";
--> statement-breakpoint
ALTER TABLE "data_import_records" ADD CONSTRAINT "data_import_records_lead_id_leads_id_fk"
  FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_imports_status_created_idx" ON "data_imports" ("status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_imports_source_created_idx" ON "data_imports" ("source_system", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_imports_created_by_idx" ON "data_imports" ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_import_records_import_status_row_idx"
  ON "data_import_records" ("import_id", "status", "row_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_import_records_lead_id_idx" ON "data_import_records" ("lead_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_import_records_source_record_idx"
  ON "data_import_records" ("object_type", "source_record_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "data_import_records_import_source_unique"
  ON "data_import_records" ("import_id", "object_type", "source_record_id")
  WHERE "source_record_id" IS NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "data_imports" ADD CONSTRAINT "data_imports_status_check"
    CHECK ("status" IN ('staged', 'validating', 'validated', 'importing', 'completed', 'completed_with_errors', 'failed', 'rolled_back'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "data_imports" ADD CONSTRAINT "data_imports_mode_check"
    CHECK ("mode" IN ('validate', 'commit'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "data_import_records" ADD CONSTRAINT "data_import_records_row_number_check"
    CHECK ("row_number" >= 1);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "data_import_records" ADD CONSTRAINT "data_import_records_status_check"
    CHECK ("status" IN ('pending', 'valid', 'imported', 'updated', 'failed', 'skipped', 'rolled_back'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TYPE "public"."crm_user_role" ADD VALUE IF NOT EXISTS 'affiliate';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'lead_offer_qualified';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."lead_opportunity_status" AS ENUM(
    'active', 'qualified', 'unqualified', 'lost', 'won', 'on_hold'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

ALTER TABLE "crm_users" ADD COLUMN IF NOT EXISTS "avatar_url" text;
--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "global_currency" text DEFAULT 'USD' NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'default_currency'
  ) THEN
    EXECUTE 'UPDATE "company_settings" SET "global_currency" = COALESCE(NULLIF("default_currency", ''''), "global_currency")';
    ALTER TABLE "company_settings" DROP COLUMN "default_currency";
  END IF;
END $$;
--> statement-breakpoint
UPDATE "company_settings" settings
SET "global_currency" = target."currency"
FROM LATERAL (
  SELECT "currency"
  FROM "sales_targets"
  WHERE "currency" IS NOT NULL AND trim("currency") <> ''
  ORDER BY "is_active" DESC, "updated_at" DESC
  LIMIT 1
) target
WHERE settings."global_currency" = 'USD' AND target."currency" <> 'USD';
--> statement-breakpoint
ALTER TABLE "sales_targets" ALTER COLUMN "currency" SET DEFAULT 'USD';
--> statement-breakpoint

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lead_customer_type" text DEFAULT 'direct' NOT NULL;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "country" text;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "region" text;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "city" text;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "address" text;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "postal_code" text;
--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "source" SET DEFAULT 'manual_entry';
--> statement-breakpoint
UPDATE "leads" SET "source" = 'website_form' WHERE "source" = 'pathway_finder';
--> statement-breakpoint
UPDATE "leads" lead
SET "assigned_user_id" = users."id"
FROM "crm_users" users
WHERE lead."assigned_user_id" IS NULL
  AND NULLIF(trim(lead."assigned_to"), '') IS NOT NULL
  AND lower(users."email") = lower(split_part(lead."assigned_to", '|', 1));
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "lead_opportunities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL,
  "offer_label" text NOT NULL,
  "status" "lead_opportunity_status" DEFAULT 'active' NOT NULL,
  "estimated_value" numeric(12, 2),
  "expected_value" numeric(12, 2),
  "close_probability" integer,
  "expected_close_date" timestamp with time zone,
  "reason" text,
  "notes" text,
  "is_primary" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "lead_opportunities"
    ADD CONSTRAINT "lead_opportunities_lead_id_leads_id_fk"
    FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'crm_status'
  ) THEN
    INSERT INTO "lead_opportunities" (
      "lead_id", "offer_label", "status", "estimated_value", "expected_value",
      "close_probability", "expected_close_date", "reason", "is_primary"
    )
    SELECT
      lead."id",
      'Primary offer',
      CASE
        WHEN lead."won_at" IS NOT NULL OR lead."crm_status"::text = 'converted' THEN 'won'::"public"."lead_opportunity_status"
        WHEN lead."lost_at" IS NOT NULL OR lead."crm_status"::text IN ('lost', 'closed') THEN 'lost'::"public"."lead_opportunity_status"
        WHEN lead."crm_status"::text = 'unqualified' THEN 'unqualified'::"public"."lead_opportunity_status"
        WHEN lead."crm_status"::text IN ('qualified', 'consultation_booked', 'application_started', 'documents_pending', 'payment_pending') THEN 'qualified'::"public"."lead_opportunity_status"
        ELSE 'active'::"public"."lead_opportunity_status"
      END,
      lead."estimated_value",
      lead."expected_value",
      lead."close_probability",
      lead."expected_close_date",
      CASE
        WHEN lead."crm_status"::text IN ('lost', 'closed', 'unqualified')
          THEN COALESCE(NULLIF(lead."lost_reason", ''), 'Migrated from legacy status: ' || lead."crm_status"::text)
        ELSE NULL
      END,
      true
    FROM "leads" lead
    WHERE (
      lead."estimated_value" IS NOT NULL OR lead."expected_value" IS NOT NULL OR
      lead."close_probability" IS NOT NULL OR lead."expected_close_date" IS NOT NULL OR
      lead."won_at" IS NOT NULL OR lead."lost_at" IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM "lead_opportunities" opportunity WHERE opportunity."lead_id" = lead."id"
    );
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'report_token'
  ) THEN
    INSERT INTO "migration_archives" (
      "source_system", "record_type", "source_record_id", "payload", "migrated_at"
    )
    SELECT
      'inherited_pathway_runtime',
      'lead',
      lead."id"::text,
      jsonb_strip_nulls(jsonb_build_object(
        'reportToken', lead."report_token",
        'completionStatus', lead."completion_status"::text,
        'crmStatus', lead."crm_status"::text,
        'primaryGoal', lead."primary_goal"::text,
        'currentStepKey', lead."current_step_key",
        'currentStepIndex', lead."current_step_index",
        'progressPercent', lead."progress_percent",
        'readinessLevel', lead."readiness_level",
        'topPathwayTitle', lead."top_pathway_title",
        'answers', lead."answers",
        'report', lead."report",
        'publicReport', lead."public_report",
        'analytics', lead."analytics",
        'sync', lead."sync",
        'completedAt', lead."completed_at"
      )),
      now()
    FROM "leads" lead
    ON CONFLICT ("source_system", "record_type", "source_record_id")
    DO UPDATE SET "payload" = EXCLUDED."payload", "migrated_at" = EXCLUDED."migrated_at";

    UPDATE "leads" lead
    SET "won_at" = COALESCE(lead."won_at", lead."completed_at", lead."updated_at")
    WHERE lead."crm_status"::text = 'converted' AND lead."won_at" IS NULL;

    UPDATE "leads" lead
    SET
      "lost_at" = COALESCE(lead."lost_at", lead."completed_at", lead."updated_at"),
      "lost_reason" = COALESCE(NULLIF(lead."lost_reason", ''), 'Migrated from legacy status: ' || lead."crm_status"::text)
    WHERE lead."crm_status"::text IN ('lost', 'closed', 'unqualified') AND lead."lost_at" IS NULL;

    UPDATE "leads" lead
    SET "stage_id" = stage."id"
    FROM "lead_stages" stage
    WHERE lead."stage_id" IS NULL
      AND stage."key" = CASE lead."crm_status"::text
        WHEN 'new' THEN 'new'
        WHEN 'contacted' THEN 'contacted'
        WHEN 'qualified' THEN 'qualified'
        WHEN 'consultation_booked' THEN 'qualified'
        WHEN 'application_started' THEN 'proposal'
        WHEN 'documents_pending' THEN 'follow_up'
        WHEN 'payment_pending' THEN 'proposal'
        WHEN 'converted' THEN 'won'
        WHEN 'lost' THEN 'lost'
        WHEN 'unresponsive' THEN 'follow_up'
        WHEN 'unqualified' THEN 'lost'
        WHEN 'closed' THEN 'lost'
        ELSE 'new'
      END;
  END IF;
END $$;
--> statement-breakpoint

DROP INDEX IF EXISTS "leads_report_token_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "leads_completion_status_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "leads_crm_status_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "leads_primary_goal_idx";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "report_token";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "completion_status";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "crm_status";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "primary_goal";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "current_step_key";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "current_step_index";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "progress_percent";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "readiness_level";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "top_pathway_title";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "answers";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "report";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "public_report";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "analytics";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "sync";
--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN IF EXISTS "completed_at";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."completion_status";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."crm_status";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."primary_goal";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."sync_state";
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "forms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" text DEFAULT 'default' NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "is_active" boolean DEFAULT false NOT NULL,
  "is_public" boolean DEFAULT true NOT NULL,
  "success_message" text DEFAULT 'Thank you for your submission.' NOT NULL,
  "redirect_url" text,
  "primary_color" text,
  "accent_color" text,
  "logo_url" text,
  "enable_auto_qualify" boolean DEFAULT false NOT NULL,
  "auto_qualify_rules" jsonb,
  "default_status" text DEFAULT 'new' NOT NULL,
  "default_priority" text DEFAULT 'medium' NOT NULL,
  "default_source" text DEFAULT 'website_form' NOT NULL,
  "default_owner_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "form_fields" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "form_id" uuid NOT NULL,
  "field_type" text NOT NULL,
  "label" text NOT NULL,
  "placeholder" text,
  "help_text" text,
  "is_required" boolean DEFAULT false NOT NULL,
  "is_visible" boolean DEFAULT true NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "options" jsonb,
  "validation_rules" jsonb,
  "maps_to_lead_field" text,
  "show_when" jsonb,
  "default_value" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "form_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "form_id" uuid NOT NULL,
  "name" text NOT NULL,
  "condition_field_id" uuid NOT NULL,
  "condition_operator" text DEFAULT 'equals' NOT NULL,
  "condition_value" text,
  "action_type" text NOT NULL,
  "action_target" text,
  "action_value" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "form_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "form_id" uuid NOT NULL,
  "lead_id" uuid,
  "data" jsonb NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "referrer" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "applied_rules" jsonb,
  "created_lead_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "is_active" SET DEFAULT false;
--> statement-breakpoint
UPDATE "forms" SET "is_active" = false WHERE "status" <> 'active';
--> statement-breakpoint
UPDATE "forms" SET "is_public" = false WHERE "status" = 'archived';
--> statement-breakpoint
UPDATE "forms" SET "status" = 'draft' WHERE "status" NOT IN ('draft', 'active', 'archived');
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_forms_id_fk"
    FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "form_rules" ADD CONSTRAINT "form_rules_form_id_forms_id_fk"
    FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "form_rules" ADD CONSTRAINT "form_rules_condition_field_id_form_fields_id_fk"
    FOREIGN KEY ("condition_field_id") REFERENCES "public"."form_fields"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk"
    FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "form_submissions" DROP CONSTRAINT IF EXISTS "form_submissions_lead_id_fkey";
--> statement-breakpoint
ALTER TABLE "form_submissions" DROP CONSTRAINT IF EXISTS "form_submissions_lead_id_leads_id_fk";
--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_lead_id_leads_id_fk"
  FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "form_submissions" DROP CONSTRAINT IF EXISTS "form_submissions_created_lead_id_fkey";
--> statement-breakpoint
ALTER TABLE "form_submissions" DROP CONSTRAINT IF EXISTS "form_submissions_created_lead_id_leads_id_fk";
--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_created_lead_id_leads_id_fk"
  FOREIGN KEY ("created_lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "role_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "role" "crm_user_role" NOT NULL,
  "permission" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

INSERT INTO "migration_archives" (
  "source_system", "record_type", "source_record_id", "payload"
)
SELECT
  'leads_desk_integrity_repair',
  'duplicate_custom_field_value',
  value."id"::text,
  to_jsonb(value)
FROM (
  SELECT value.*, row_number() OVER (
    PARTITION BY value."lead_id", value."custom_field_id"
    ORDER BY value."updated_at" DESC, value."created_at" DESC, value."id" DESC
  ) AS duplicate_rank
  FROM "lead_custom_field_values" value
) value
WHERE value.duplicate_rank > 1
ON CONFLICT ("source_system", "record_type", "source_record_id") DO NOTHING;
--> statement-breakpoint
DELETE FROM "lead_custom_field_values" value
USING (
  SELECT "id" FROM (
    SELECT "id", row_number() OVER (
      PARTITION BY "lead_id", "custom_field_id"
      ORDER BY "updated_at" DESC, "created_at" DESC, "id" DESC
    ) AS duplicate_rank
    FROM "lead_custom_field_values"
  ) ranked
  WHERE ranked.duplicate_rank > 1
) duplicate
WHERE value."id" = duplicate."id";
--> statement-breakpoint

WITH ranked_primary AS (
  SELECT "id", row_number() OVER (
    PARTITION BY "lead_id"
    ORDER BY "updated_at" DESC, "created_at" DESC, "id" DESC
  ) AS primary_rank
  FROM "lead_opportunities"
  WHERE "is_primary" = true AND "archived_at" IS NULL
)
UPDATE "lead_opportunities" opportunity
SET "is_primary" = false, "updated_at" = now()
FROM ranked_primary ranked
WHERE opportunity."id" = ranked."id" AND ranked.primary_rank > 1;
--> statement-breakpoint

INSERT INTO "migration_archives" (
  "source_system", "record_type", "source_record_id", "payload"
)
SELECT
  'leads_desk_integrity_repair',
  'invalid_lead_opportunity',
  opportunity."id"::text,
  to_jsonb(opportunity)
FROM "lead_opportunities" opportunity
WHERE opportunity."close_probability" < 0
   OR opportunity."close_probability" > 100
   OR opportunity."estimated_value" < 0
   OR opportunity."expected_value" < 0
   OR opportunity."sort_order" < 0
   OR (
     opportunity."status" IN ('lost', 'unqualified')
     AND NULLIF(trim(opportunity."reason"), '') IS NULL
   )
ON CONFLICT ("source_system", "record_type", "source_record_id") DO NOTHING;
--> statement-breakpoint
UPDATE "lead_opportunities"
SET
  "close_probability" = CASE
    WHEN "close_probability" IS NULL THEN NULL
    ELSE LEAST(100, GREATEST(0, "close_probability"))
  END,
  "estimated_value" = CASE
    WHEN "estimated_value" IS NULL THEN NULL
    ELSE GREATEST(0, "estimated_value")
  END,
  "expected_value" = CASE
    WHEN "expected_value" IS NULL THEN NULL
    ELSE GREATEST(0, "expected_value")
  END,
  "sort_order" = GREATEST(0, "sort_order"),
  "reason" = CASE
    WHEN "status" IN ('lost', 'unqualified')
      THEN COALESCE(NULLIF(trim("reason"), ''), 'Migrated without a recorded reason')
    ELSE "reason"
  END,
  "updated_at" = now()
WHERE "close_probability" < 0
   OR "close_probability" > 100
   OR "estimated_value" < 0
   OR "expected_value" < 0
   OR "sort_order" < 0
   OR ("status" IN ('lost', 'unqualified') AND NULLIF(trim("reason"), '') IS NULL);
--> statement-breakpoint

INSERT INTO "migration_archives" (
  "source_system", "record_type", "source_record_id", "payload"
)
SELECT 'leads_desk_integrity_repair', 'invalid_form_field_order', field."id"::text, to_jsonb(field)
FROM "form_fields" field
WHERE field."order" < 0
ON CONFLICT ("source_system", "record_type", "source_record_id") DO NOTHING;
--> statement-breakpoint
UPDATE "form_fields" SET "order" = 0, "updated_at" = now() WHERE "order" < 0;
--> statement-breakpoint
INSERT INTO "migration_archives" (
  "source_system", "record_type", "source_record_id", "payload"
)
SELECT 'leads_desk_integrity_repair', 'invalid_form_rule_order', rule."id"::text, to_jsonb(rule)
FROM "form_rules" rule
WHERE rule."order" < 0
ON CONFLICT ("source_system", "record_type", "source_record_id") DO NOTHING;
--> statement-breakpoint
UPDATE "form_rules" SET "order" = 0, "updated_at" = now() WHERE "order" < 0;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "lead_opportunities_lead_id_idx" ON "lead_opportunities" ("lead_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_opportunities_status_idx" ON "lead_opportunities" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_opportunities_is_primary_idx" ON "lead_opportunities" ("is_primary");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_opportunities_archived_at_idx" ON "lead_opportunities" ("archived_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_opportunities_sort_order_idx" ON "lead_opportunities" ("sort_order");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lead_opportunities_active_primary_unique"
  ON "lead_opportunities" ("lead_id") WHERE "is_primary" = true AND "archived_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_opportunities_pipeline_idx"
  ON "lead_opportunities" ("archived_at", "status", "lead_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lead_custom_field_values_lead_field_unique"
  ON "lead_custom_field_values" ("lead_id", "custom_field_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "forms_workspace_id_idx" ON "forms" ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "forms_slug_idx" ON "forms" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "forms_status_idx" ON "forms" ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "forms_slug_workspace_unique" ON "forms" ("slug", "workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_fields_form_id_idx" ON "form_fields" ("form_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_fields_order_idx" ON "form_fields" ("form_id", "order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_rules_form_id_idx" ON "form_rules" ("form_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_rules_order_idx" ON "form_rules" ("form_id", "order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_submissions_form_id_idx" ON "form_submissions" ("form_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_submissions_lead_id_idx" ON "form_submissions" ("lead_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_submissions_status_idx" ON "form_submissions" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_submissions_created_at_idx" ON "form_submissions" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_submissions_form_created_id_idx"
  ON "form_submissions" ("form_id", "created_at", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_role_permission_unique"
  ON "role_permissions" ("role", "permission");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "role_permissions_role_idx" ON "role_permissions" ("role");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "leads_customer_type_idx" ON "leads" ("lead_customer_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_country_idx" ON "leads" ("country");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_region_idx" ON "leads" ("region");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_city_idx" ON "leads" ("city");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_updated_at_id_idx" ON "leads" ("updated_at", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_active_queue_idx" ON "leads" ("deleted_at", "updated_at", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_owner_active_queue_idx"
  ON "leads" ("assigned_user_id", "deleted_at", "updated_at", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_stage_active_queue_idx"
  ON "leads" ("stage_id", "deleted_at", "updated_at", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_source_active_queue_idx"
  ON "leads" ("source_id", "deleted_at", "updated_at", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_customer_type_active_queue_idx"
  ON "leads" ("lead_customer_type", "deleted_at", "updated_at", "id");
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "lead_opportunities" ADD CONSTRAINT "lead_opportunities_probability_check"
    CHECK ("close_probability" IS NULL OR ("close_probability" >= 0 AND "close_probability" <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "lead_opportunities" ADD CONSTRAINT "lead_opportunities_estimated_value_check"
    CHECK ("estimated_value" IS NULL OR "estimated_value" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "lead_opportunities" ADD CONSTRAINT "lead_opportunities_expected_value_check"
    CHECK ("expected_value" IS NULL OR "expected_value" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "lead_opportunities" ADD CONSTRAINT "lead_opportunities_sort_order_check"
    CHECK ("sort_order" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "lead_opportunities" ADD CONSTRAINT "lead_opportunities_reason_check"
    CHECK (
      "status" NOT IN ('lost', 'unqualified')
      OR NULLIF(trim("reason"), '') IS NOT NULL
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "forms" ADD CONSTRAINT "forms_status_check"
    CHECK ("status" IN ('draft', 'active', 'archived'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_order_check" CHECK ("order" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "form_rules" ADD CONSTRAINT "form_rules_order_check" CHECK ("order" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
