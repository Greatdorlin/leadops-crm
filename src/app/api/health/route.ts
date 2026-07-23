import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import {
  getAllowedEmailDomains,
  isGoogleAuthConfigured,
  isLocalAdminPreviewEnabled,
} from "@/lib/admin-access";
import { getDb } from "@/lib/db/client";
import { hasDatabaseUrl } from "@/lib/db/env";
import { buildHealthResponse, isHealthReady } from "@/lib/health-response";

export const dynamic = "force-dynamic";

const DATABASE_HEALTH_TTL_MS = 5_000;

let databaseHealthCache: { reachable: boolean; expiresAt: number } | null = null;
let databaseHealthCheckInFlight: Promise<boolean> | null = null;

function hasEnvValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

async function probeDatabase() {
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

async function canReachDatabase() {
  const now = Date.now();
  if (databaseHealthCache && databaseHealthCache.expiresAt > now) {
    return databaseHealthCache.reachable;
  }

  if (databaseHealthCheckInFlight) {
    return databaseHealthCheckInFlight;
  }

  databaseHealthCheckInFlight = probeDatabase()
    .then((reachable) => {
      databaseHealthCache = {
        reachable,
        expiresAt: Date.now() + DATABASE_HEALTH_TTL_MS,
      };
      return reachable;
    })
    .finally(() => {
      databaseHealthCheckInFlight = null;
    });

  return databaseHealthCheckInFlight;
}

export async function GET() {
  const environment = process.env.NODE_ENV ?? "development";
  const databaseConfigured = hasDatabaseUrl();
  const databaseReachable = await canReachDatabase();
  const googleAuthEnabled = process.env.ENABLE_GOOGLE_LOGIN?.trim().toLowerCase() === "true";
  const checks = {
    databaseConfigured,
    databaseReachable,
    authSecretConfigured: hasEnvValue(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET),
    googleAuthEnabled,
    googleAuthConfigured: isGoogleAuthConfigured(),
    initialAdminConfigured:
      hasEnvValue(process.env.INITIAL_ADMIN_EMAIL) && hasEnvValue(process.env.INITIAL_ADMIN_NAME),
    allowedDomainRestrictionEnabled: getAllowedEmailDomains().length > 0,
    devPreviewEnabled: isLocalAdminPreviewEnabled(),
  };

  const ok = isHealthReady(environment, checks);

  return NextResponse.json(
    buildHealthResponse({
      ok,
      environment,
      timestamp: new Date().toISOString(),
      checks,
    }),
    {
      status: ok ? 200 : 503,
    },
  );
}
