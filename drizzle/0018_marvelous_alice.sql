CREATE TABLE "currency_exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_currency" text NOT NULL,
	"quote_currency" text NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"updated_by" text,
	"fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "currency_exchange_rates_positive_rate_check" CHECK ("currency_exchange_rates"."rate" > 0),
	CONSTRAINT "currency_exchange_rates_different_currency_check" CHECK ("currency_exchange_rates"."base_currency" <> "currency_exchange_rates"."quote_currency"),
	CONSTRAINT "currency_exchange_rates_source_check" CHECK ("currency_exchange_rates"."source" in ('manual', 'automatic'))
);
--> statement-breakpoint
CREATE TABLE "payment_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_by_user_id" uuid,
	"submitted_by_email" text,
	"reviewed_by_user_id" uuid,
	"reviewed_by_email" text,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"commission_amount" numeric(12, 2),
	"commission_recipient_user_id" uuid,
	"commission_confirmed_at" timestamp with time zone,
	"commission_confirmed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_claims_amount_check" CHECK ("payment_claims"."amount" > 0),
	CONSTRAINT "payment_claims_commission_amount_check" CHECK ("payment_claims"."commission_amount" is null or "payment_claims"."commission_amount" >= 0),
	CONSTRAINT "payment_claims_status_check" CHECK ("payment_claims"."status" in ('pending', 'approved', 'rejected')),
	CONSTRAINT "payment_claims_review_state_check" CHECK (("payment_claims"."status" = 'pending' and "payment_claims"."reviewed_at" is null) or ("payment_claims"."status" <> 'pending' and "payment_claims"."reviewed_at" is not null)),
	CONSTRAINT "payment_claims_commission_state_check" CHECK ("payment_claims"."commission_confirmed_at" is null or "payment_claims"."status" = 'approved')
);
--> statement-breakpoint
ALTER TABLE "payment_claims" ADD CONSTRAINT "payment_claims_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_claims" ADD CONSTRAINT "payment_claims_submitted_by_user_id_crm_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."crm_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_claims" ADD CONSTRAINT "payment_claims_reviewed_by_user_id_crm_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."crm_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_claims" ADD CONSTRAINT "payment_claims_commission_recipient_user_id_crm_users_id_fk" FOREIGN KEY ("commission_recipient_user_id") REFERENCES "public"."crm_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_claims" ADD CONSTRAINT "payment_claims_commission_confirmed_by_user_id_crm_users_id_fk" FOREIGN KEY ("commission_confirmed_by_user_id") REFERENCES "public"."crm_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "currency_exchange_rates_pair_unique" ON "currency_exchange_rates" USING btree ("base_currency","quote_currency");--> statement-breakpoint
CREATE INDEX "currency_exchange_rates_source_idx" ON "currency_exchange_rates" USING btree ("source");--> statement-breakpoint
CREATE INDEX "payment_claims_lead_id_idx" ON "payment_claims" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "payment_claims_status_created_at_idx" ON "payment_claims" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "payment_claims_commission_recipient_idx" ON "payment_claims" USING btree ("commission_recipient_user_id");
