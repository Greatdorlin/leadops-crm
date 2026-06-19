CREATE TYPE "public"."custom_field_type" AS ENUM('text', 'textarea', 'number', 'currency', 'date', 'datetime', 'select', 'multi_select', 'checkbox', 'phone', 'email', 'url', 'user_reference', 'file_url');--> statement-breakpoint
CREATE TYPE "public"."form_field_core_target" AS ENUM('name', 'email', 'phone', 'companyName', 'sourceId', 'campaignLabel', 'priority', 'estimatedValue', 'expectedCloseDate', 'notes');--> statement-breakpoint
CREATE TYPE "public"."form_field_target_type" AS ENUM('core', 'custom');--> statement-breakpoint
CREATE TYPE "public"."form_source_type" AS ENUM('website', 'wordpress', 'webhook', 'csv', 'manual', 'ads', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_intake_event_status" AS ENUM('received', 'mapped', 'lead_created', 'failed', 'ignored');--> statement-breakpoint
CREATE TABLE "custom_field_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"custom_field_id" uuid NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" "custom_field_type" NOT NULL,
	"description" text,
	"placeholder" text,
	"required" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"show_in_table" boolean DEFAULT false NOT NULL,
	"show_in_form" boolean DEFAULT true NOT NULL,
	"show_in_details" boolean DEFAULT true NOT NULL,
	"searchable" boolean DEFAULT false NOT NULL,
	"filterable" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_field_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_source_id" uuid NOT NULL,
	"external_field_name" text NOT NULL,
	"external_field_label" text,
	"target_type" "form_field_target_type" NOT NULL,
	"target_field" "form_field_core_target",
	"custom_field_id" uuid,
	"required" boolean DEFAULT false NOT NULL,
	"transform_rule" text,
	"fallback_value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "form_source_type" NOT NULL,
	"source_id" text,
	"webhook_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"default_stage_id" uuid,
	"default_assigned_user_id" uuid,
	"default_team_id" uuid,
	"default_branch_id" uuid,
	"default_department_id" uuid,
	"default_priority" "lead_priority",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_custom_field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"custom_field_id" uuid NOT NULL,
	"value" jsonb NOT NULL,
	"display_value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_intake_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_source_id" uuid,
	"lead_id" uuid,
	"raw_payload" jsonb NOT NULL,
	"normalized_payload" jsonb,
	"status" "lead_intake_event_status" NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_field_options" ADD CONSTRAINT "custom_field_options_custom_field_id_custom_fields_id_fk" FOREIGN KEY ("custom_field_id") REFERENCES "public"."custom_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_field_mappings" ADD CONSTRAINT "form_field_mappings_form_source_id_form_sources_id_fk" FOREIGN KEY ("form_source_id") REFERENCES "public"."form_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_field_mappings" ADD CONSTRAINT "form_field_mappings_custom_field_id_custom_fields_id_fk" FOREIGN KEY ("custom_field_id") REFERENCES "public"."custom_fields"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_custom_field_values" ADD CONSTRAINT "lead_custom_field_values_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_custom_field_values" ADD CONSTRAINT "lead_custom_field_values_custom_field_id_custom_fields_id_fk" FOREIGN KEY ("custom_field_id") REFERENCES "public"."custom_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_intake_events" ADD CONSTRAINT "lead_intake_events_form_source_id_form_sources_id_fk" FOREIGN KEY ("form_source_id") REFERENCES "public"."form_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_intake_events" ADD CONSTRAINT "lead_intake_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_field_options_custom_field_id_idx" ON "custom_field_options" USING btree ("custom_field_id");--> statement-breakpoint
CREATE INDEX "custom_field_options_archived_idx" ON "custom_field_options" USING btree ("archived");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_fields_key_unique" ON "custom_fields" USING btree ("key");--> statement-breakpoint
CREATE INDEX "custom_fields_archived_idx" ON "custom_fields" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "custom_fields_sort_order_idx" ON "custom_fields" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "form_field_mappings_form_source_id_idx" ON "form_field_mappings" USING btree ("form_source_id");--> statement-breakpoint
CREATE INDEX "form_field_mappings_custom_field_id_idx" ON "form_field_mappings" USING btree ("custom_field_id");--> statement-breakpoint
CREATE INDEX "form_sources_type_idx" ON "form_sources" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "form_sources_webhook_key_unique" ON "form_sources" USING btree ("webhook_key");--> statement-breakpoint
CREATE INDEX "form_sources_is_active_idx" ON "form_sources" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "lead_custom_field_values_lead_id_idx" ON "lead_custom_field_values" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_custom_field_values_custom_field_id_idx" ON "lead_custom_field_values" USING btree ("custom_field_id");--> statement-breakpoint
CREATE INDEX "lead_intake_events_form_source_id_idx" ON "lead_intake_events" USING btree ("form_source_id");--> statement-breakpoint
CREATE INDEX "lead_intake_events_lead_id_idx" ON "lead_intake_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_intake_events_status_idx" ON "lead_intake_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lead_intake_events_created_at_idx" ON "lead_intake_events" USING btree ("created_at");