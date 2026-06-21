import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "@neondatabase/serverless";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const migrationPath = resolve(process.cwd(), "drizzle/0010_staged_legacy_exorcism.sql");
  const sql = await readFile(migrationPath, "utf8");
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(sql);
    console.log("Applied drizzle/0010_staged_legacy_exorcism.sql");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
