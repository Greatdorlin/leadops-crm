import { readMigrationFiles } from "drizzle-orm/migrator";

export interface MigrationSession {
  execute(sql: string, params?: Array<string | number>): Promise<unknown>;
  applied(): Promise<Array<{ hash: string; created_at: string | number }>>;
  transaction<T>(work: (session: MigrationSession) => Promise<T>): Promise<T>;
}

/** Keep Drizzle's journal/hashes while committing each version before the next.
 * PostgreSQL cannot use an enum value until the transaction adding it commits.
 * Callers must serialize concurrent deployments with a session advisory lock.
 */
export async function applyMigrations(session: MigrationSession, folder = "drizzle") {
  const migrations = readMigrationFiles({ migrationsFolder: folder });
  await session.execute('CREATE SCHEMA IF NOT EXISTS "drizzle"');
  await session.execute('CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)');
  const history = await session.applied();
  const known = new Map(migrations.map(m => [m.folderMillis, m.hash]));
  for (const entry of history) {
    if (known.get(Number(entry.created_at)) !== entry.hash) {
      throw new Error("Migration history differs from the committed journal. Restore the matching release before migrating.");
    }
  }
  const latest = Math.max(0, ...history.map(m => Number(m.created_at)));
  let applied = 0;
  for (const migration of migrations) {
    if (migration.folderMillis <= latest) continue;
    await session.transaction(async transaction => {
      for (const statement of migration.sql) {
        if (statement.trim()) await transaction.execute(statement);
      }
      await transaction.execute('INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)', [migration.hash, migration.folderMillis]);
    });
    applied++;
  }
  return { applied, total: migrations.length };
}
