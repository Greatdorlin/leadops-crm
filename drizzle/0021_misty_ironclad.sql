CREATE TABLE "workspace_automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"condition_field" text NOT NULL,
	"condition_operator" text DEFAULT 'equals' NOT NULL,
	"condition_value" text NOT NULL,
	"action_type" text NOT NULL,
	"action_value" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_automation_rules_condition_operator_check" CHECK ("workspace_automation_rules"."condition_operator" in ('equals', 'not_equals')),
	CONSTRAINT "workspace_automation_rules_condition_field_check" CHECK ("workspace_automation_rules"."condition_field" in ('source', 'stage', 'priority', 'country', 'customer_type')),
	CONSTRAINT "workspace_automation_rules_action_type_check" CHECK ("workspace_automation_rules"."action_type" in ('assign_owner', 'set_stage', 'set_priority')),
	CONSTRAINT "workspace_automation_rules_sort_order_check" CHECK ("workspace_automation_rules"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE INDEX "workspace_automation_rules_active_order_idx" ON "workspace_automation_rules" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "workspace_automation_rules_condition_field_idx" ON "workspace_automation_rules" USING btree ("condition_field");