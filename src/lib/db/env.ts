import { normalizeEnvValue } from "@/lib/env-utils";

export function getDatabaseUrl() {
  return [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.PATHWAYFINDER_DATABASE_URL,
    process.env.PATHWAYFINDER_POSTGRES_URL,
    process.env.PATHWAYFINDER_POSTGRES_PRISMA_URL,
    process.env.PATHWAYFINDER_POSTGRES_URL_NON_POOLING,
  ]
    .map(normalizeEnvValue)
    .find(Boolean) ?? "";
}

export function hasDatabaseUrl() {
  return Boolean(getDatabaseUrl());
}
