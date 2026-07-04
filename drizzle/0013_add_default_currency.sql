-- Add default_currency to company_settings
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "default_currency" text NOT NULL DEFAULT 'NGN';
