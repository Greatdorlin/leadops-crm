ALTER TYPE "public"."notification_type" ADD VALUE 'bulk_change_completed';--> statement-breakpoint
ALTER TABLE "lead_custom_field_values" DROP CONSTRAINT "lead_custom_field_values_lead_id_leads_id_fk";
--> statement-breakpoint
ALTER TABLE "lead_custom_field_values" ADD CONSTRAINT "lead_custom_field_values_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
