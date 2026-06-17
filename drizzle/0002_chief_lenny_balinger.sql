CREATE TYPE "public"."crm_user_role" AS ENUM('admin', 'manager', 'sales_agent', 'ad_manager', 'consultant', 'finance');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('facebook', 'google_sheets', 'google_ads', 'sender', 'website');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('healthy', 'pending_sync', 'failed', 'not_configured', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."lead_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."source_payload_processing_status" AS ENUM('pending', 'processing', 'processed', 'failed', 'duplicate', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."sync_job_status" AS ENUM('pending', 'running', 'success', 'failed', 'partial');--> statement-breakpoint
ALTER TYPE "public"."crm_status" ADD VALUE 'consultation_booked' BEFORE 'unqualified';--> statement-breakpoint
ALTER TYPE "public"."crm_status" ADD VALUE 'application_started' BEFORE 'unqualified';--> statement-breakpoint
ALTER TYPE "public"."crm_status" ADD VALUE 'documents_pending' BEFORE 'unqualified';--> statement-breakpoint
ALTER TYPE "public"."crm_status" ADD VALUE 'payment_pending' BEFORE 'unqualified';--> statement-breakpoint
ALTER TYPE "public"."crm_status" ADD VALUE 'converted' BEFORE 'unqualified';--> statement-breakpoint
ALTER TYPE "public"."crm_status" ADD VALUE 'lost' BEFORE 'unqualified';--> statement-breakpoint
ALTER TYPE "public"."crm_status" ADD VALUE 'unresponsive' BEFORE 'unqualified';--> statement-breakpoint
CREATE TABLE "ad_campaign_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"account_id" text DEFAULT '' NOT NULL,
	"campaign_id" text DEFAULT '' NOT NULL,
	"campaign_name" text DEFAULT '' NOT NULL,
	"ad_group_id" text DEFAULT '' NOT NULL,
	"ad_group_name" text DEFAULT '' NOT NULL,
	"ad_id" text DEFAULT '' NOT NULL,
	"ad_name" text DEFAULT '' NOT NULL,
	"date" date NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"spend" numeric(12, 2) DEFAULT '0' NOT NULL,
	"leads" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"raw_metrics" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"role" "crm_user_role" DEFAULT 'sales_agent' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"account_name" text,
	"external_account_id" text,
	"status" "integration_status" DEFAULT 'not_configured' NOT NULL,
	"access_token_encrypted" text,
	"refresh_token_encrypted" text,
	"config" jsonb,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"event_data" jsonb,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"note" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_source_payloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"external_id" text,
	"payload" jsonb NOT NULL,
	"processing_status" "source_payload_processing_status" DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"assigned_to" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"job_type" text NOT NULL,
	"status" "sync_job_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "source" text DEFAULT 'pathway_finder' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "source_detail" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "priority" "lead_priority" DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "assigned_to" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "facebook_leadgen_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "facebook_form_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "facebook_page_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "facebook_campaign_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "facebook_ad_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "facebook_adset_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "google_click_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "google_campaign_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "google_ad_group_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "google_ad_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "utm_source" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "utm_medium" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "utm_campaign" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "utm_content" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "utm_term" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "landing_page" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "source_payload" jsonb;--> statement-breakpoint
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_tasks" ADD CONSTRAINT "lead_tasks_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_campaign_metrics_provider_campaign_date_idx" ON "ad_campaign_metrics" USING btree ("provider","campaign_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "ad_campaign_metrics_lookup_unique" ON "ad_campaign_metrics" USING btree ("provider","account_id","campaign_id","ad_group_id","ad_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_users_email_unique" ON "crm_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "crm_users_role_idx" ON "crm_users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "crm_users_is_active_idx" ON "crm_users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "integrations_provider_idx" ON "integrations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "integrations_status_idx" ON "integrations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_provider_account_unique" ON "integrations" USING btree ("provider","external_account_id");--> statement-breakpoint
CREATE INDEX "lead_events_lead_id_idx" ON "lead_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_events_event_type_idx" ON "lead_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "lead_events_created_at_idx" ON "lead_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "lead_notes_lead_id_idx" ON "lead_notes" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_notes_created_at_idx" ON "lead_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "lead_source_payloads_source_idx" ON "lead_source_payloads" USING btree ("source");--> statement-breakpoint
CREATE INDEX "lead_source_payloads_external_id_idx" ON "lead_source_payloads" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "lead_source_payloads_processing_status_idx" ON "lead_source_payloads" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "lead_source_payloads_source_external_id_idx" ON "lead_source_payloads" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "lead_tasks_lead_id_idx" ON "lead_tasks" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_tasks_assigned_to_idx" ON "lead_tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "lead_tasks_due_at_idx" ON "lead_tasks" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "lead_tasks_completed_at_idx" ON "lead_tasks" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "sync_jobs_provider_status_idx" ON "sync_jobs" USING btree ("provider","status");--> statement-breakpoint
CREATE INDEX "sync_jobs_created_at_idx" ON "sync_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_source_idx" ON "leads" USING btree ("source");--> statement-breakpoint
CREATE INDEX "leads_priority_idx" ON "leads" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "leads_assigned_to_idx" ON "leads" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_whatsapp_number_idx" ON "leads" USING btree ("whatsapp_number");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_facebook_leadgen_id_unique" ON "leads" USING btree ("facebook_leadgen_id");--> statement-breakpoint
CREATE INDEX "leads_google_click_id_idx" ON "leads" USING btree ("google_click_id");--> statement-breakpoint
CREATE INDEX "leads_utm_campaign_idx" ON "leads" USING btree ("utm_campaign");