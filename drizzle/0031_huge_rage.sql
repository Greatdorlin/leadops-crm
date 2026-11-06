CREATE TABLE IF NOT EXISTS "user_guides" (
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"version" integer NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_guides_user_id_role_version_pk" PRIMARY KEY("user_id","role","version")
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "user_guides" ADD CONSTRAINT "user_guides_user_id_crm_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."crm_users"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
