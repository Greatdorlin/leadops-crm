import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getAllowedEmailDomains, isLocalAdminPreviewEnabled } from "@/lib/admin-access";
import { getDb } from "@/lib/db/client";
import { hasDatabaseUrl } from "@/lib/db/env";

export const dynamic = "force-dynamic";

function hasEnvValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

async function canReachDatabase() {
  if (!hasDatabaseUrl()) {
    return false;
  }

  try {
    await Promise.race([
      getDb().execute(sql`select 1`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database health check timed out.")), 5_000),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const environment = process.env.NODE_ENV ?? "development";
  const databaseConfigured = hasDatabaseUrl();
  const databaseReachable = await canReachDatabase();
  const checks = {
    databaseConfigured,
    databaseReachable,
    authSecretConfigured: hasEnvValue(process.env.AUTH_SECRET),
    googleAuthConfigured:
      hasEnvValue(process.env.AUTH_GOOGLE_ID) && hasEnvValue(process.env.AUTH_GOOGLE_SECRET),
    initialAdminConfigured:
      hasEnvValue(process.env.INITIAL_ADMIN_EMAIL) && hasEnvValue(process.env.INITIAL_ADMIN_NAME),
    allowedDomainRestrictionEnabled: getAllowedEmailDomains().length > 0,
    devPreviewEnabled: isLocalAdminPreviewEnabled(),
  };

  const ok =
    checks.databaseConfigured &&
    checks.databaseReachable &&
    (environment !== "production" ||
      (checks.authSecretConfigured &&
        checks.googleAuthConfigured &&
        checks.initialAdminConfigured &&
        !checks.devPreviewEnabled));

  return NextResponse.json(
    {
      ok,
      service: "Leads Desk",
      environment,
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: ok ? 200 : 503,
    },
  );
}
