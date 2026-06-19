import { NextResponse } from "next/server";
import { getAllowedEmailDomains, isLocalAdminPreviewEnabled } from "@/lib/admin-access";
import { hasDatabaseUrl } from "@/lib/db/env";

function hasEnvValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET() {
  const environment = process.env.NODE_ENV ?? "development";
  const checks = {
    databaseConfigured: hasDatabaseUrl(),
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
