ALTER TABLE "company_settings" ADD COLUMN "logo_url_light_mode" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "logo_url_dark_mode" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "login_logo_url_light_mode" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "login_logo_url_dark_mode" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "font_preset" text DEFAULT 'brand' NOT NULL;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "celebrations_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "stage_celebrations_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "target_celebrations_enabled" boolean DEFAULT true NOT NULL;