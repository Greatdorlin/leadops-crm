CREATE TABLE IF NOT EXISTS "forms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" text NOT NULL DEFAULT 'default',
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'draft',
  "is_active" boolean NOT NULL DEFAULT true,
  "is_public" boolean NOT NULL DEFAULT true,
  "success_message" text NOT NULL DEFAULT 'Thank you for your submission.',
  "redirect_url" text,
  "primary_color" text,
  "accent_color" text,
  "logo_url" text,
  "enable_auto_qualify" boolean NOT NULL DEFAULT false,
  "auto_qualify_rules" jsonb,
  "default_status" text NOT NULL DEFAULT 'new',
  "default_priority" text NOT NULL DEFAULT 'medium',
  "default_source" text NOT NULL DEFAULT 'website_form',
  "default_owner_id" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "forms_slug_workspace_unique" ON "forms" ("slug", "workspace_id");
CREATE INDEX IF NOT EXISTS "forms_workspace_id_idx" ON "forms" ("workspace_id");
CREATE INDEX IF NOT EXISTS "forms_slug_idx" ON "forms" ("slug");
CREATE INDEX IF NOT EXISTS "forms_status_idx" ON "forms" ("status");

CREATE TABLE IF NOT EXISTS "form_fields" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" uuid NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
  "field_type" text NOT NULL,
  "label" text NOT NULL,
  "placeholder" text,
  "help_text" text,
  "is_required" boolean NOT NULL DEFAULT false,
  "is_visible" boolean NOT NULL DEFAULT true,
  "order" integer NOT NULL DEFAULT 0,
  "options" jsonb,
  "validation_rules" jsonb,
  "maps_to_lead_field" text,
  "show_when" jsonb,
  "default_value" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "form_fields_form_id_idx" ON "form_fields" ("form_id");
CREATE INDEX IF NOT EXISTS "form_fields_order_idx" ON "form_fields" ("form_id", "order");

CREATE TABLE IF NOT EXISTS "form_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" uuid NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "condition_field_id" uuid NOT NULL REFERENCES "form_fields"("id") ON DELETE CASCADE,
  "condition_operator" text NOT NULL DEFAULT 'equals',
  "condition_value" text,
  "action_type" text NOT NULL,
  "action_target" text,
  "action_value" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "form_rules_form_id_idx" ON "form_rules" ("form_id");
CREATE INDEX IF NOT EXISTS "form_rules_order_idx" ON "form_rules" ("form_id", "order");

CREATE TABLE IF NOT EXISTS "form_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" uuid NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
  "lead_id" uuid REFERENCES "leads"("id") ON DELETE SET NULL,
  "data" jsonb NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "referrer" text,
  "status" text NOT NULL DEFAULT 'pending',
  "applied_rules" jsonb,
  "created_lead_id" uuid REFERENCES "leads"("id"),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "form_submissions_form_id_idx" ON "form_submissions" ("form_id");
CREATE INDEX IF NOT EXISTS "form_submissions_lead_id_idx" ON "form_submissions" ("lead_id");
CREATE INDEX IF NOT EXISTS "form_submissions_status_idx" ON "form_submissions" ("status");
CREATE INDEX IF NOT EXISTS "form_submissions_created_at_idx" ON "form_submissions" ("created_at");
