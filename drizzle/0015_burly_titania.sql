ALTER TABLE "leads" ADD COLUMN "affiliate_referrer_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_affiliate_referrer_id_crm_users_id_fk" FOREIGN KEY ("affiliate_referrer_id") REFERENCES "public"."crm_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_affiliate_referrer_id_idx" ON "leads" USING btree ("affiliate_referrer_id");--> statement-breakpoint
CREATE FUNCTION "prevent_affiliate_referrer_change"() RETURNS trigger AS $$
BEGIN
	IF NEW."affiliate_referrer_id" IS DISTINCT FROM OLD."affiliate_referrer_id" THEN
		RAISE EXCEPTION 'affiliate referral attribution is immutable';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "leads_affiliate_referrer_immutable"
BEFORE UPDATE OF "affiliate_referrer_id" ON "leads"
FOR EACH ROW EXECUTE FUNCTION "prevent_affiliate_referrer_change"();--> statement-breakpoint
INSERT INTO "role_permissions" ("role", "permission", "enabled") VALUES
	('affiliate', 'canViewLeads', true),
	('affiliate', 'canCreateLeads', true)
ON CONFLICT ("role", "permission") DO UPDATE SET
	"enabled" = EXCLUDED."enabled",
	"updated_at" = now();
