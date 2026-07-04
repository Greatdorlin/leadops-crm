CREATE TABLE IF NOT EXISTS "role_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "role" crm_user_role NOT NULL,
  "permission" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_role_permission_unique" ON "role_permissions" ("role", "permission");
CREATE INDEX IF NOT EXISTS "role_permissions_role_idx" ON "role_permissions" ("role");

-- Composite index for efficient cursor-based pagination on leads
CREATE INDEX IF NOT EXISTS "leads_updated_at_id_idx" ON "leads" ("updated_at", "id");
