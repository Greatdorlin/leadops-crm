import assert from "node:assert/strict";
import test from "node:test";
import { buildLeadAuditChanges, formatLeadAuditChanges } from "@/lib/crm/lead-audit-events";

test("structured lead audit changes retain only changed before and after values", () => {
  const changes = buildLeadAuditChanges([
    { field: "firstName", label: "First name", before: "Ada", after: "Ada" },
    { field: "companyName", label: "Company", before: null, after: "Analytical Engines" },
    { field: "expectedCloseDate", label: "Expected close date", before: new Date("2026-07-18T10:00:00.000Z"), after: null },
  ]);

  assert.deepEqual(changes, [
    { field: "companyName", label: "Company", before: null, after: "Analytical Engines" },
    { field: "expectedCloseDate", label: "Expected close date", before: "2026-07-18T10:00:00.000Z", after: null },
  ]);
});

test("structured lead audit changes render readable activity copy", () => {
  assert.equal(formatLeadAuditChanges({ changes: [
    { field: "status", label: "Status", before: "active", after: "won" },
    { field: "isPrimary", label: "Primary offer", before: false, after: true },
  ] }), "Status: active -> won; Primary offer: No -> Yes");
  assert.equal(formatLeadAuditChanges({ changedFields: ["status"] }), null);
});
