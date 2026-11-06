import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { applyMigrations, type MigrationSession } from "@/lib/db/migrations";
import { eq, is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "@/lib/db/schema";
import type { DatabaseExecutor } from "@/lib/db/client";
import { NeonLeadStore } from "./neon-store";

// Real in-process PostgreSQL, no network, external database, credentials, or live CRM writes.
const client = new PGlite();
const db = drizzle(client, { schema });
// Both adapters implement the same query API; only their transport/session types differ.
const store = new NeonLeadStore(() => db as unknown as DatabaseExecutor);
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
before(async () => {
  await applyMigrations(session(client));
  Object.assign(globalThis, { __leadsDeskDb: db });
});
after(async () => {
  Reflect.deleteProperty(globalThis, "__leadsDeskDb");
  await client.close();
});

async function lead(email: string) {
  return store.createExternalLead({
    source: "manual_entry",
    firstName: "Buyer",
    lastName: "Verification",
    email,
    estimatedValue: 1000,
  });
}

test("migrations create a working data model and reject invalid money and orphan notes", async () => {
  const item = await lead("constraints@example.invalid");
  await assert.rejects(
    db
      .insert(schema.leadOpportunities)
      .values({ leadId: item.id, offerLabel: "Invalid", estimatedValue: "-1" }),
  );
  await assert.rejects(
    db
      .insert(schema.leadNotes)
      .values({ leadId: crypto.randomUUID(), note: "Orphan" }),
  );
});

test("intake deduplicates normalized contacts while preserving existing identity", async () => {
  const first = await store.upsertExternalLead({
    source: "manual_entry",
    email: "integration@example.invalid",
    firstName: "Original",
  });
  const next = await store.upsertExternalLead({
    source: "manual_entry",
    email: " INTEGRATION@example.invalid ",
    firstName: "Replacement",
    city: "Kigali",
  });
  assert.equal(first.created, true);
  assert.equal(next.created, false);
  assert.equal(next.lead.id, first.lead.id);
  assert.equal(next.lead.firstName, "Original");
  assert.equal(next.lead.city, "Kigali");
  assert.ok((await store.listLeadEvents(first.lead.id)).length > 0);
});

test("profile, owners, workflow and history persist together and no-op updates add no events", async () => {
  const item = await lead("workflow@example.invalid");
  const [stage] = await db
    .insert(schema.leadStages)
    .values({ key: "integration-qualified", name: "Qualified", sortOrder: 2 })
    .returning();
  await store.updateLeadProfile(
    item.id,
    { firstName: "Updated", estimatedValue: 2500 },
    "owner@example.invalid",
  );
  await store.assignLeadOwners(
    item.id,
    ["owner@example.invalid"],
    "owner@example.invalid",
  );
  const result = await store.updateLeadWorkflow(
    item.id,
    {
      stageId: stage.id,
      priority: "high",
      nextFollowUpAt: "2030-01-01T12:00:00Z",
    },
    "owner@example.invalid",
  );
  assert.equal(result?.firstName, "Updated");
  assert.equal(result?.estimatedValue, 2500);
  assert.deepEqual(result?.assignedToList, ["owner@example.invalid"]);
  assert.equal(result?.stageId, stage.id);
  const count = (await store.listLeadEvents(item.id)).length;
  await store.updateLeadWorkflow(item.id, {
    stageId: stage.id,
    priority: "high",
  });
  assert.equal((await store.listLeadEvents(item.id)).length, count);
});

test("notes and tasks persist, completion is idempotent, and trash removes active records", async () => {
  const item = await lead("activity@example.invalid");
  const note = await store.addLeadNote({
    leadId: item.id,
    note: "A useful follow-up",
    createdBy: "owner@example.invalid",
  });
  assert.equal((await store.listLeadNotes(item.id))[0].id, note.id);
  const task = await store.addLeadTask({
    leadId: item.id,
    title: "Call prospect",
    dueAt: "2030-01-01T12:00:00Z",
  });
  assert.equal(
    (await store.listLeadTasks({ leadId: item.id, completion: "open" })).length,
    1,
  );
  await store.completeLeadTask(task.id, "owner@example.invalid");
  await store.completeLeadTask(task.id, "owner@example.invalid");
  assert.equal(
    (await store.listLeadTasks({ leadId: item.id, completion: "open" })).length,
    0,
  );
  await store.softDeleteLead(item.id, "owner@example.invalid");
  assert.equal((await store.list({ search: item.email })).length, 0);
  assert.equal(
    (await store.list({ search: item.email, recordState: "trashed" })).length,
    1,
  );
  await store.restoreLead(item.id, "owner@example.invalid");
  assert.equal((await store.list({ search: item.email })).length, 1);
});

test("lost leads leave open pipeline value while contact and historical value remain", async () => {
  const item = await lead("lost@example.invalid");
  const before = await store.getSalesPipelineAggregate();
  await store.updateLeadWorkflow(item.id, {
    lostAt: new Date().toISOString(),
    lostReason: "Timing",
  });
  const after = await store.getSalesPipelineAggregate();
  assert.equal(after.pipelineValue, before.pipelineValue - 1000);
  assert.equal((await store.getById(item.id))?.estimatedValue, 1000);
  assert.equal(
    (await db.select().from(schema.leads).where(eq(schema.leads.id, item.id)))
      .length,
    1,
  );
});

test("migration journal is repeatable, detects tampering, and preserves existing records", async () => {
  const count = await store.countLeads();
  const result = await applyMigrations(session(client));
  assert.equal(result.applied, 0);
  assert.equal(await store.countLeads(), count);
  await client.query(
    "UPDATE drizzle.__drizzle_migrations SET hash = 'tampered' WHERE id = 1",
  );
  await assert.rejects(applyMigrations(session(client)), /history differs/);
  // Restore only our disposable test journal; production never rewrites history.
  const { readMigrationFiles } = await import("drizzle-orm/migrator");
  await client.query(
    "UPDATE drizzle.__drizzle_migrations SET hash = $1 WHERE id = 1",
    [readMigrationFiles({ migrationsFolder: "drizzle" })[0].hash],
  );
});

test("source payload failures can be retried and resolved without losing the original payload", async () => {
  const input = {
    source: "website_form" as const,
    payload: { test: true },
    externalId: "test-event",
  };
  const item = await store.saveSourcePayload(input);
  assert.equal(item.processingStatus, "pending");
  await store.markPayloadProcessing(item.id);
  await store.markPayloadFailed(item.id, "Provider unavailable");
  assert.ok(
    (await store.listFailedPayloads(input.source)).some(
      (row) => row.id === item.id,
    ),
  );
  const retried = await store.retrySourcePayload(item.id);
  assert.equal(retried?.retryCount, 1);
  const completed = await store.markPayloadProcessed(item.id);
  assert.equal(completed?.processingStatus, "processed");
  assert.deepEqual(completed?.payload, input.payload);
  assert.ok(completed?.processedAt);
  assert.equal((await store.listFailedPayloads(input.source)).length, 0);
});

test("users and connector configuration upsert without duplication; job state remains queryable", async () => {
  const first = await store.upsertCrmUser({
    email: " USER@example.invalid ",
    fullName: " First ",
    role: "sales_agent",
  });
  const second = await store.upsertCrmUser({
    email: "user@example.invalid",
    fullName: "Second",
    role: "sales_agent",
  });
  assert.equal(first.id, second.id);
  assert.equal(
    (await store.getCrmUserByEmail("USER@example.invalid"))?.fullName,
    "Second",
  );
  await store.setCrmUserActive(first.id, false);
  assert.equal((await store.getCrmUserById(first.id))?.isActive, false);
  assert.ok((await store.listCrmUsers()).some((row) => row.id === first.id));
  const integration = await store.upsertIntegration({
    provider: "facebook",
    accountName: "Test page",
    status: "not_configured",
  });
  const updated = await store.upsertIntegration({
    provider: "facebook",
    accountName: "Updated test page",
  });
  assert.equal(updated.id, integration.id);
  assert.equal(
    (await store.getIntegration("facebook"))?.accountName,
    "Updated test page",
  );
  assert.equal(
    (await store.listIntegrations()).filter(
      (row) => row.provider === "facebook",
    ).length,
    1,
  );
  const job = await store.createSyncJob({
    provider: "facebook",
    jobType: "verify",
  });
  await store.updateSyncJob(job.id, {
    status: "success",
    finishedAt: new Date(),
  });
  assert.equal(
    (await store.listSyncJobs({ provider: "facebook", status: "success" }))[0]
      .id,
    job.id,
  );
});

test("all report queries execute against the migrated schema and denied scope returns no leads", async () => {
  assert.equal(await store.countLeads({ scopeDenied: true }), 0);
  assert.equal((await store.list({ scopeDenied: true })).length, 0);
  assert.ok(await store.getDashboardStats());
  assert.ok(Array.isArray(await store.getDashboardTrend()));
  assert.ok(Array.isArray(await store.getTeamPerformance()));
  assert.ok(Array.isArray(await store.getSourceReport()));
  assert.ok(await store.getLeadDistributionReport());
  assert.ok(Array.isArray(await store.getCampaignReport()));
  assert.equal(
    await store.countGoogleAdsCampaignLeads({
      campaignId: "nonexistent-campaign",
      campaignName: "",
    }),
    0,
  );
});

test("per-product qualification persists independently and rejects another lead's opportunity IDs atomically", async () => {
  const { replaceLeadOpportunities } = await import(
    "@/lib/crm/lead-opportunities"
  );
  const item = await lead("products@example.invalid");
  const other = await lead("other-products@example.invalid");
  const input = [
    {
      offerLabel: "Office plan",
      status: "unqualified" as const,
      reason: "Needs a smaller plan",
      estimatedValue: 9000,
      currency: "USD" as const,
      isPrimary: true,
    },
    {
      offerLabel: "Starter plan",
      status: "qualified" as const,
      estimatedValue: 1200,
      currency: "USD" as const,
      isPrimary: false,
    },
  ];
  const result = await replaceLeadOpportunities(item.id, input, {
    globalCurrency: "USD",
    createCallTasksForNewlyQualified: true,
  });
  assert.equal(result.opportunities.length, 2);
  assert.equal(result.createdCallTaskCount, 1);
  assert.equal(result.rollup.estimatedValue, 1200);
  const id = result.opportunities[0].id;
  await assert.rejects(
    replaceLeadOpportunities(other.id, [{ ...input[0], id }]),
    /does not belong/,
  );
  assert.equal(
    (
      await db
        .select()
        .from(schema.leadOpportunities)
        .where(eq(schema.leadOpportunities.leadId, other.id))
    ).length,
    0,
  );
  const again = await replaceLeadOpportunities(
    item.id,
    result.opportunities.map((row) => ({ ...row, currency: "USD" as const, isPrimary: row.isPrimary })),
    { globalCurrency: "USD", createCallTasksForNewlyQualified: true },
  );
  assert.equal(again.createdCallTaskCount, 0);
  assert.equal((await store.listLeadTasks({ leadId: item.id })).length, 1);
});

test("form creation, publication, duplication and submission retries preserve one lead and its tasks", async () => {
  const forms = await import("@/lib/crm/form-builder-store");
  const built = await forms.createFormWithFields(
    { name: "SQL verified form", slug: "sql-verified" },
    [
      {
        fieldType: "email",
        label: "Email",
        mapsToLeadField: "email",
        isRequired: true,
      },
    ],
  );
  assert.equal(await forms.getPublicFormBySlug("sql-verified"), null);
  await forms.updateForm(built.form.id, {
    status: "active",
    isActive: true,
    isPublic: true,
  });
  assert.ok(await forms.getPublicFormBySlug("sql-verified"));
  const copied = await forms.duplicateForm(built.form.id, {
    name: "Copy",
    slug: "sql-copy",
  });
  assert.equal(copied?.status, "draft");
  assert.equal((await forms.listFormFields(copied!.id)).length, 1);
  const id = crypto.randomUUID();
  const submission = await forms.createFormSubmission({
    id,
    formId: built.form.id,
    data: { [built.fields[0].id]: "submitted@example.invalid" },
  });
  const retry = await forms.createFormSubmission({
    id,
    formId: built.form.id,
    data: { [built.fields[0].id]: "submitted@example.invalid" },
  });
  assert.equal(retry.id, submission.id);
  const input = {
    email: "submitted@example.invalid",
    firstName: "Submitted",
    tasks: [{ title: "Follow up submission" }],
  };
  const first = await forms.createLeadFromFormSubmission(id, input);
  const second = await forms.createLeadFromFormSubmission(id, input);
  assert.equal(first?.created, true);
  assert.equal(second?.created, false);
  const { getLeadCapturedFormAnswers } = await import("@/lib/crm/form-captured-answers");
  assert.deepEqual(await getLeadCapturedFormAnswers(first!.leadId!), [{label:"Email", value:"submitted@example.invalid"}]);
  assert.equal((await forms.getFormResourceCounts([built.form.id])).get(built.form.id)?.publicFieldCount, 1);
  assert.equal(first?.leadId, second?.leadId);
  assert.equal(
    (await store.listLeadTasks({ leadId: first!.leadId! })).length,
    1,
  );
  const differentForm = await forms.createForm({
    name: "Different",
    slug: "different-form",
  });
  await assert.rejects(
    forms.createFormSubmission({ id, formId: differentForm.id, data: {} }),
    /could not be recovered/,
  );
});


test("fresh database boolean defaults match the typed schema, including inactive draft forms", async () => {
  const result = await client.query<{ table_name: string; column_name: string; column_default: string }>(
    "SELECT table_name, column_name, column_default FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'boolean'",
  );
  const actual = new Map(result.rows.map(row => [`${row.table_name}.${row.column_name}`, row.column_default]));
  let checked = 0;
  const mismatches: string[] = [];
  for (const entity of Object.values(schema)) {
    if (!is(entity, PgTable)) continue;
    const table = getTableConfig(entity);
    for (const column of table.columns) {
      if (typeof column.default !== "boolean") continue;
      const key = `${table.name}.${column.name}`;
      if (actual.get(key) !== String(column.default)) mismatches.push(`${key}: database=${actual.get(key)} schema=${column.default}`);
      checked++;
    }
  }
  assert.deepEqual(mismatches, []);
  assert.ok(checked > 20);
});
