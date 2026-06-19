CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('new_lead_assigned', 'follow_up_due', 'follow_up_overdue', 'lead_stage_changed', 'lead_marked_won', 'lead_marked_lost', 'webhook_lead_captured', 'import_completed', 'export_completed', 'target_milestone_reached');--> statement-breakpoint
CREATE TYPE "public"."sales_target_period" AS ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."sales_target_scope" AS ENUM('global', 'branch', 'department', 'team', 'user');--> statement-breakpoint
CREATE TABLE "notification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"recipient_user_id" uuid,
	"lead_id" uuid,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sales_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"scope" "sales_target_scope" NOT NULL,
	"scope_id" uuid,
	"period" "sales_target_period" NOT NULL,
	"target_value" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_events_recipient_user_id_idx" ON "notification_events" USING btree ("recipient_user_id");--> statement-breakpoint
CREATE INDEX "notification_events_lead_id_idx" ON "notification_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "notification_events_status_idx" ON "notification_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notification_events_created_at_idx" ON "notification_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sales_targets_scope_idx" ON "sales_targets" USING btree ("scope","scope_id");--> statement-breakpoint
CREATE INDEX "sales_targets_period_idx" ON "sales_targets" USING btree ("period");--> statement-breakpoint
CREATE INDEX "sales_targets_archived_idx" ON "sales_targets" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "sales_targets_is_active_idx" ON "sales_targets" USING btree ("is_active");