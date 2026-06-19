import { normalizeEnvValue } from "@/lib/env-utils";

const databaseEnvLookupOrder = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "PATHWAYFINDER_DATABASE_URL",
  "PATHWAYFINDER_POSTGRES_URL",
  "PATHWAYFINDER_POSTGRES_PRISMA_URL",
  "PATHWAYFINDER_POSTGRES_URL_NON_POOLING",
] as const;

export function getDatabaseUrl() {
  return (
    databaseEnvLookupOrder
      .map((envName) => normalizeEnvValue(process.env[envName]))
      .find(Boolean) ?? ""
  );
}

export function hasDatabaseUrl() {
  return Boolean(getDatabaseUrl());
}
