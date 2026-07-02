DO $$ BEGIN
 CREATE TYPE "public"."lead_opportunity_status" AS ENUM('active', 'qualified', 'unqualified', 'lost', 'won', 'on_hold');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "lead_opportunities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL,
  "offer_label" text NOT NULL,
  "status" "lead_opportunity_status" DEFAULT 'active' NOT NULL,
  "estimated_value" numeric(12, 2),
  "expected_value" numeric(12, 2),
  "close_probability" integer,
  "expected_close_date" timestamp with time zone,
  "reason" text,
  "notes" text,
  "is_primary" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "lead_opportunities"
 ADD CONSTRAINT "lead_opportunities_lead_id_leads_id_fk"
 FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "lead_opportunities_lead_id_idx" ON "lead_opportunities" USING btree ("lead_id");
CREATE INDEX IF NOT EXISTS "lead_opportunities_status_idx" ON "lead_opportunities" USING btree ("status");
CREATE INDEX IF NOT EXISTS "lead_opportunities_is_primary_idx" ON "lead_opportunities" USING btree ("is_primary");
CREATE INDEX IF NOT EXISTS "lead_opportunities_archived_at_idx" ON "lead_opportunities" USING btree ("archived_at");
CREATE INDEX IF NOT EXISTS "lead_opportunities_sort_order_idx" ON "lead_opportunities" USING btree ("sort_order");
