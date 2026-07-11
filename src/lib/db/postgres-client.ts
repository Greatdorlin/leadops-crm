import postgres from "postgres";

function readPositiveInteger(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

function resolveSslMode(databaseUrl: URL) {
  const sslMode = databaseUrl.searchParams.get("sslmode")?.toLowerCase();
  if (sslMode === "disable") {
    return false;
  }

  if (sslMode === "verify-full") {
    return "verify-full" as const;
  }

  if (sslMode) {
    return "require" as const;
  }

  const isLocal =
    databaseUrl.hostname === "localhost" ||
    databaseUrl.hostname === "127.0.0.1" ||
    databaseUrl.hostname === "::1";
  return isLocal ? false : ("require" as const);
}

export function createPostgresClient(
  databaseUrl: string,
  overrides: {
    connectTimeoutSeconds?: number;
    idleTimeoutSeconds?: number;
    maxConnections?: number;
  } = {},
) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("Database URL is invalid.");
  }

  return postgres(databaseUrl, {
    connect_timeout:
      overrides.connectTimeoutSeconds ??
      readPositiveInteger(process.env.DATABASE_CONNECT_TIMEOUT_SECONDS, 30, 60),
    fetch_types: false,
    idle_timeout:
      overrides.idleTimeoutSeconds ??
      readPositiveInteger(process.env.DATABASE_IDLE_TIMEOUT_SECONDS, 20, 300),
    max:
      overrides.maxConnections ??
      readPositiveInteger(process.env.DATABASE_POOL_MAX, 5, 50),
    prepare: false,
    ssl: resolveSslMode(parsedUrl),
  });
}
