import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { getDatabaseUrl } from "./env";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Database URL is not configured.");
  }

  try {
    new URL(databaseUrl);
  } catch {
    throw new Error("Database URL is invalid.");
  }

  const client = neon(databaseUrl);
  dbInstance = drizzle(client, { schema });

  return dbInstance;
}
