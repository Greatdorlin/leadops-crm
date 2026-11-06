import "dotenv/config";
import { readFileSync } from "node:fs";
import { createPostgresClient } from "@/lib/db/postgres-client";
import { getDatabaseUrl } from "@/lib/db/env";
// Additive preparation only. Historical migrations are deliberately not replayed
// against an existing client database. The normal journalled migration is idempotent.
async function main() {
  const url = getDatabaseUrl();
  if (!url) throw new Error("Database URL is required.");
  const journal = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8"),
  );
  const entry = journal.entries.find((e: { idx: number }) => e.idx === (process.argv.includes("--controls") ? 29 : 28));
  if (!entry) throw new Error("Assistant migration not found.");
  const ddl = readFileSync(`drizzle/${entry.tag}.sql`, "utf8");
  const client = createPostgresClient(url, { maxConnections: 1 });
  try {
    await client.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(1734452457)`;
      await tx.unsafe(ddl);
    });
    console.info(
      "Additive assistant tables are prepared. Existing client records were not changed.",
    );
  } finally {
    await client.end();
  }
}
main().catch(() => {
  console.error(
    "Assistant preparation failed. Inspect database schema before retrying.",
  );
  process.exitCode = 1;
});
