export interface HealthChecks {
  databaseConfigured: boolean;
  databaseReachable: boolean;
  authSecretConfigured: boolean;
  googleAuthConfigured: boolean;
  initialAdminConfigured: boolean;
  allowedDomainRestrictionEnabled: boolean;
  devPreviewEnabled: boolean;
}

export function buildHealthResponse(input: {
  environment: string;
  ok: boolean;
  timestamp: string;
  checks: HealthChecks;
}) {
  const base = {
    ok: input.ok,
    service: "Leads Desk",
    timestamp: input.timestamp,
  };

  return input.environment === "production"
    ? base
    : { ...base, environment: input.environment, checks: input.checks };
}
