CREATE TABLE "workspace_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"actor_user_id" uuid,
	"actor_email" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_audit_logs" ADD CONSTRAINT "workspace_audit_logs_actor_user_id_crm_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."crm_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_audit_logs_event_created_idx" ON "workspace_audit_logs" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE INDEX "workspace_audit_logs_actor_created_idx" ON "workspace_audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "workspace_audit_logs_target_idx" ON "workspace_audit_logs" USING btree ("target_type","target_id");