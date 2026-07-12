ALTER TABLE "crm_users" ADD COLUMN "access_scope" text DEFAULT 'own' NOT NULL;--> statement-breakpoint
UPDATE "crm_users" SET "access_scope" = 'all' WHERE "role" IN ('admin', 'manager');--> statement-breakpoint
ALTER TABLE "crm_users" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_users" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "crm_users" ADD COLUMN "team_id" uuid;--> statement-breakpoint
CREATE INDEX "crm_users_branch_id_idx" ON "crm_users" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "crm_users_department_id_idx" ON "crm_users" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "crm_users_team_id_idx" ON "crm_users" USING btree ("team_id");
