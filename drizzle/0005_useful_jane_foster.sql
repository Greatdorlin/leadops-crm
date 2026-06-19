CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"manager_user_id" uuid,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"manager_user_id" uuid,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"type" text,
	"color" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_won" boolean DEFAULT false NOT NULL,
	"is_lost" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"manager_user_id" uuid,
	"branch_id" uuid,
	"department_id" uuid,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "company_name" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "source_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "stage_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "campaign_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "campaign_label" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "assigned_user_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "estimated_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "expected_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "won_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "close_probability" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "expected_close_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "won_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "lost_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "lost_reason" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "next_follow_up_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "branches_name_idx" ON "branches" USING btree ("name");--> statement-breakpoint
CREATE INDEX "branches_archived_idx" ON "branches" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "departments_name_idx" ON "departments" USING btree ("name");--> statement-breakpoint
CREATE INDEX "departments_archived_idx" ON "departments" USING btree ("archived");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_sources_key_unique" ON "lead_sources" USING btree ("key");--> statement-breakpoint
CREATE INDEX "lead_sources_type_idx" ON "lead_sources" USING btree ("type");--> statement-breakpoint
CREATE INDEX "lead_sources_archived_idx" ON "lead_sources" USING btree ("archived");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_stages_key_unique" ON "lead_stages" USING btree ("key");--> statement-breakpoint
CREATE INDEX "lead_stages_sort_order_idx" ON "lead_stages" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "lead_stages_archived_idx" ON "lead_stages" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "teams_name_idx" ON "teams" USING btree ("name");--> statement-breakpoint
CREATE INDEX "teams_branch_id_idx" ON "teams" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "teams_department_id_idx" ON "teams" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "teams_archived_idx" ON "teams" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "leads_source_id_idx" ON "leads" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "leads_assigned_user_id_idx" ON "leads" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "leads_stage_id_idx" ON "leads" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "leads_team_id_idx" ON "leads" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "leads_branch_id_idx" ON "leads" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "leads_department_id_idx" ON "leads" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "leads_next_follow_up_at_idx" ON "leads" USING btree ("next_follow_up_at");--> statement-breakpoint
CREATE INDEX "leads_archived_at_idx" ON "leads" USING btree ("archived_at");