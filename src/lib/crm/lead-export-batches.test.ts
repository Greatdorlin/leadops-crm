import assert from "node:assert/strict";
import test from "node:test";
import { LeadExportLimitError, listLeadsForSynchronousExport } from "@/lib/crm/lead-export-batches";
import type { LeadRecord } from "@/lib/crm/types";

function createLead(index: number): LeadRecord {
  const timestamp = new Date(Date.UTC(2026, 6, 11, 12, 0, 0) - index * 1_000).toISOString();
  return {
    id: `lead-${index}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastActivityAt: timestamp,
  } as LeadRecord;
}

test("synchronous export reads every allowed row in bounded batches", async () => {
  const leads = Array.from({ length: 450 }, (_, index) => createLead(index));
  let call = 0;
  const reader = {
    countLeads: async () => leads.length,
    list: async (filters: { limit?: number }) => {
      const offset = call * 200;
      call += 1;
      return leads.slice(offset, offset + (filters.limit ?? 200));
    },
  };

  const exported = await listLeadsForSynchronousExport(reader, {}, 500);

  assert.equal(exported.length, 450);
  assert.equal(call, 3);
});

test("synchronous export refuses an unsafe result set before loading rows", async () => {
  let listCalled = false;
  const reader = {
    countLeads: async () => 5_001,
    list: async () => {
      listCalled = true;
      return [] as LeadRecord[];
    },
  };

  await assert.rejects(
    () => listLeadsForSynchronousExport(reader, {}, 5_000),
    (error: unknown) => error instanceof LeadExportLimitError && error.rowCount === 5_001,
  );
  assert.equal(listCalled, false);
});
