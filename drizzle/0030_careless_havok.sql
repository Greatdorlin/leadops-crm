CREATE TABLE IF NOT EXISTS "inbox_mailboxes" (
	"id" text PRIMARY KEY DEFAULT 'workspace' NOT NULL,
	"config_cipher" text NOT NULL,
	"verified_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"last_uid" integer DEFAULT 0 NOT NULL,
	"uid_validity" text,
	"sync_lease_until" timestamp with time zone,
	"last_error_code" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"sender_user_id" uuid,
	"direction" text DEFAULT 'team' NOT NULL,
	"content_cipher" text NOT NULL,
	"delivery_status" text DEFAULT 'sent' NOT NULL,
	"provider_key" text,
	"internet_message_id" text,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inbox_participants" (
	"thread_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbox_participants_thread_id_user_id_pk" PRIMARY KEY("thread_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inbox_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"channel" text DEFAULT 'team' NOT NULL,
	"subject_cipher" text NOT NULL,
	"customer_cipher" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_thread_id_inbox_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."inbox_threads"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_sender_user_id_crm_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."crm_users"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "inbox_participants" ADD CONSTRAINT "inbox_participants_thread_id_inbox_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."inbox_threads"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "inbox_participants" ADD CONSTRAINT "inbox_participants_user_id_crm_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."crm_users"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "inbox_threads" ADD CONSTRAINT "inbox_threads_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "inbox_threads" ADD CONSTRAINT "inbox_threads_created_by_crm_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."crm_users"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inbox_messages_request_idx" ON "inbox_messages" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inbox_messages_provider_idx" ON "inbox_messages" USING btree ("provider_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inbox_messages_internet_idx" ON "inbox_messages" USING btree ("internet_message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_messages_thread_cursor_idx" ON "inbox_messages" USING btree ("thread_id","created_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_participants_user_idx" ON "inbox_participants" USING btree ("user_id","thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_threads_updated_idx" ON "inbox_threads" USING btree ("updated_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_threads_lead_idx" ON "inbox_threads" USING btree ("lead_id");