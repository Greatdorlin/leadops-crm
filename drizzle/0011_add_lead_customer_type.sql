ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lead_customer_type" text DEFAULT 'direct' NOT NULL;
CREATE INDEX IF NOT EXISTS "leads_customer_type_idx" ON "leads" ("lead_customer_type");
