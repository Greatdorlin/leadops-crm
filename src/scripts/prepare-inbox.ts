import "dotenv/config";
import { readFileSync } from "node:fs";
import { createPostgresClient } from "@/lib/db/postgres-client";
import { getDatabaseUrl } from "@/lib/db/env";
async function main() {
  const url = getDatabaseUrl();
  if (!url) throw new Error("Database required.");
  const journal = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8"),
  );
  const entries = journal.entries.filter((e: { idx: number }) =>
    [30, 31].includes(e.idx),
  );
  if (entries.length !== 2) throw new Error("Inbox migration not found.");
  const client = createPostgresClient(url, { maxConnections: 1 });
  try {
    await client.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(1734452457)`;
      for (const entry of entries)
        await tx.unsafe(readFileSync(`drizzle/${entry.tag}.sql`, "utf8"));
    });
    console.info(
      "Additive Inbox tables prepared. Existing CRM records were not changed.",
    );
  } finally {
    await client.end();
  }
}
main().catch(() => {
  console.error(
    "Inbox preparation failed. Inspect the database schema before retrying.",
  );
  process.exitCode = 1;
});
