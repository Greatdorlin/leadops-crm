import "dotenv/config";
import { createPostgresClient } from "@/lib/db/postgres-client";
import { getDatabaseUrl } from "@/lib/db/env";
import { applyMigrations, type MigrationSession } from "@/lib/db/migrations";
import { logger, classifyError } from "@/lib/logger";

async function main() {
  const url = getDatabaseUrl();
  if (!url) throw new Error("Database URL is not configured.");
  const client = createPostgresClient(url, { maxConnections: 1 });
  const connection = await client.reserve();
  function session(sql: typeof connection): MigrationSession {
    return {
      execute: (query, params = []) => sql.unsafe(query, params),
      applied: () => sql<{ hash: string; created_at: string }[]>`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`,
      transaction: async work => {
        await sql.unsafe("BEGIN");
        try {
          const result = await work(session(sql));
          await sql.unsafe("COMMIT");
          return result;
        } catch (error) {
          await sql.unsafe("ROLLBACK");
          throw error;
        }
      },
    };
  }
  try {
    await connection`SELECT pg_advisory_lock(1734452457)`;
    const result = await applyMigrations(session(connection));
    logger.info({ scope: "db:migrate", ...result }, "Database migrations complete");
  } finally {
    try { await connection`SELECT pg_advisory_unlock(1734452457)`; }
    finally { connection.release(); await client.end(); }
  }
}

main().catch(error => {
  logger.error({ scope: "db:migrate", error: classifyError(error) }, "Migration failed; inspect the migration and database journal before retrying");
  process.exitCode = 1;
});
