import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import * as schema from "./schema";
import { getDatabaseUrl } from "./env";
import { createPostgresClient } from "./postgres-client";

type Database = PostgresJsDatabase<typeof schema>;
type PostgresClient = Sql;

export type DatabaseExecutor = Pick<
  Database,
  "delete" | "insert" | "query" | "select" | "update"
>;

const globalDatabase = globalThis as typeof globalThis & {
  __leadsDeskDb?: Database;
  __leadsDeskPostgres?: PostgresClient;
};

export function getDb() {
  if (globalDatabase.__leadsDeskDb) {
    return globalDatabase.__leadsDeskDb;
  }

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Database URL is not configured.");
  }

  const client =
    globalDatabase.__leadsDeskPostgres ?? createPostgresClient(databaseUrl);
  const database = drizzle(client, { schema });

  globalDatabase.__leadsDeskPostgres = client;
  globalDatabase.__leadsDeskDb = database;

  return database;
}
