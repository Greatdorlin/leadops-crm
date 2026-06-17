CREATE TYPE "public"."completion_status" AS ENUM('incomplete', 'complete');--> statement-breakpoint
CREATE TYPE "public"."crm_status" AS ENUM('new', 'contacted', 'qualified', 'unqualified', 'closed');--> statement-breakpoint
CREATE TYPE "public"."primary_goal" AS ENUM('study_abroad', 'work_and_relocate', 'business_abroad', 'visit_or_tour', 'event_travel', 'family_relocation', 'not_sure_yet');--> statement-breakpoint
CREATE TYPE "public"."sync_state" AS ENUM('pending', 'success', 'failed', 'not_configured', 'skipped');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_token" uuid,
	"completion_status" "completion_status" DEFAULT 'incomplete' NOT NULL,
	"crm_status" "crm_status" DEFAULT 'new' NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"whatsapp_number" text DEFAULT '' NOT NULL,
	"primary_goal" "primary_goal",
	"current_step_key" text DEFAULT 'first_name' NOT NULL,
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"readiness_level" text,
	"top_pathway_title" text,
	"answers" jsonb NOT NULL,
	"report" jsonb,
	"analytics" jsonb NOT NULL,
	"sync" jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "leads_report_token_unique" ON "leads" USING btree ("report_token");--> statement-breakpoint
CREATE INDEX "leads_completion_status_idx" ON "leads" USING btree ("completion_status");--> statement-breakpoint
CREATE INDEX "leads_crm_status_idx" ON "leads" USING btree ("crm_status");--> statement-breakpoint
CREATE INDEX "leads_primary_goal_idx" ON "leads" USING btree ("primary_goal");--> statement-breakpoint
CREATE INDEX "leads_updated_at_idx" ON "leads" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");