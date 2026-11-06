DO $assistant$
DECLARE present integer;
BEGIN
 SELECT count(*) INTO present FROM unnest(ARRAY['public.assistant_settings','public.assistant_members','public.assistant_clients','public.assistant_codes','public.assistant_tokens','public.assistant_changes','public.product_catalog']) AS t(name) WHERE to_regclass(t.name) IS NOT NULL;
 IF present NOT IN (0,7) THEN RAISE EXCEPTION 'Assistant schema is incomplete; inspect before retry'; END IF;
 IF present = 0 THEN
CREATE TABLE "assistant_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"client_id" text,
	"action" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"result" jsonb,
	CONSTRAINT "assistant_changes_request_id_unique" UNIQUE("request_id")
);

CREATE TABLE "assistant_clients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"auth_method" text DEFAULT 'none' NOT NULL,
	"secret_hash" text,
	"redirect_uris" jsonb NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "assistant_codes" (
	"hash" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"redirect_uri" text NOT NULL,
	"challenge" text NOT NULL,
	"resource" text NOT NULL,
	"scope" text NOT NULL,
	"generation" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE "assistant_members" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"personal_name" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"can_write" boolean DEFAULT false NOT NULL,
	"generation" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "assistant_settings" (
	"id" text PRIMARY KEY DEFAULT 'workspace' NOT NULL,
	"name" text DEFAULT 'Yapper' NOT NULL,
	"name_locked" boolean DEFAULT false NOT NULL
);

CREATE TABLE "assistant_tokens" (
	"access_hash" text PRIMARY KEY NOT NULL,
	"refresh_hash" text NOT NULL,
	"family_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"resource" text NOT NULL,
	"scope" text NOT NULL,
	"generation" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"refresh_expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "assistant_tokens_refresh_hash_unique" UNIQUE("refresh_hash")
);

CREATE TABLE "product_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"value" numeric(14, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"probability" integer DEFAULT 50 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "assistant_changes" ADD CONSTRAINT "assistant_changes_user_id_crm_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."crm_users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assistant_codes" ADD CONSTRAINT "assistant_codes_client_id_assistant_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."assistant_clients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assistant_codes" ADD CONSTRAINT "assistant_codes_user_id_crm_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."crm_users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assistant_members" ADD CONSTRAINT "assistant_members_user_id_crm_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."crm_users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assistant_tokens" ADD CONSTRAINT "assistant_tokens_client_id_assistant_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."assistant_clients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assistant_tokens" ADD CONSTRAINT "assistant_tokens_user_id_crm_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."crm_users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "assistant_changes_user_idx" ON "assistant_changes" USING btree ("user_id","status");
CREATE INDEX "assistant_clients_created_idx" ON "assistant_clients" USING btree ("created_at");
CREATE INDEX "assistant_codes_expiry_idx" ON "assistant_codes" USING btree ("expires_at");
CREATE INDEX "assistant_tokens_user_idx" ON "assistant_tokens" USING btree ("user_id");
CREATE INDEX "assistant_tokens_family_idx" ON "assistant_tokens" USING btree ("family_id");
CREATE INDEX "assistant_tokens_expiry_idx" ON "assistant_tokens" USING btree ("refresh_expires_at");
 END IF;
END $assistant$;
