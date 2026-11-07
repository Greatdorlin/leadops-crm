import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations, type MigrationSession } from "./migrations";

function session(connection: PGlite): MigrationSession {
  return {
    execute: (sql, params = []) => connection.query(sql, params),
    applied: async () =>
      (
        await connection.query<{ hash: string; created_at: string }>(
          "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
        )
      ).rows,
    transaction: (work) =>
      connection.transaction((transaction) =>
        work(session(transaction as unknown as PGlite)),
      ),
  };
}

test("failed migration rolls back its DDL and history; earlier committed versions survive and retry safely", async () => {
  const directory = await mkdtemp(join(tmpdir(), "leads-desk-migration-"));
  const client = new PGlite();
  try {
    await mkdir(join(directory, "meta"));
    await writeFile(
      join(directory, "meta/_journal.json"),
      JSON.stringify({
        version: "7",
        dialect: "postgresql",
        entries: [
          { idx: 0, when: 1000, tag: "0000_first", breakpoints: true },
          { idx: 1, when: 2000, tag: "0001_second", breakpoints: true },
        ],
      }),
    );
    await writeFile(
      join(directory, "0000_first.sql"),
      "CREATE TABLE durable (id integer);--> statement-breakpoint INSERT INTO durable VALUES (1);",
    );
    await writeFile(
      join(directory, "0001_second.sql"),
      "CREATE TABLE failed_version (id integer);--> statement-breakpoint SELECT * FROM nonexistent_table;",
    );
    await assert.rejects(applyMigrations(session(client), directory));
    assert.equal((await client.query("SELECT * FROM durable")).rows.length, 1);
    assert.equal((await session(client).applied()).length, 1);
    await assert.rejects(client.query("SELECT * FROM failed_version"));
    // Only the unapplied fixture migration is corrected; applied history stays unchanged.
    await writeFile(
      join(directory, "0001_second.sql"),
      "CREATE TABLE failed_version (id integer);",
    );
    assert.equal(
      (await applyMigrations(session(client), directory)).applied,
      1,
    );
    assert.equal(
      (await applyMigrations(session(client), directory)).applied,
      0,
    );
  } finally {
    await client.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("prepared MFA reconciliation requires explicit opt-in and validates the existing schema", async()=>{
  const client=new PGlite();
  try{
    await applyMigrations(session(client));
    await client.exec("DELETE FROM drizzle.__drizzle_migrations WHERE created_at IN (SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 2)");
    await assert.rejects(()=>applyMigrations(session(client)));
    assert.equal((await applyMigrations(session(client),"drizzle",{acceptPreparedMfa:true})).applied,2);
    assert.equal((await applyMigrations(session(client))).applied,0);
    await client.exec("DELETE FROM drizzle.__drizzle_migrations WHERE created_at=(SELECT max(created_at) FROM drizzle.__drizzle_migrations); ALTER TABLE user_credentials ALTER COLUMN mfa_changed_at TYPE text");
    await assert.rejects(()=>applyMigrations(session(client),"drizzle",{acceptPreparedMfa:true}),/differs/);
  }finally{await client.close()}
});
