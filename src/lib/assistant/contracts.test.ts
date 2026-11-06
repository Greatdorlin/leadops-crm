import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  validPkce,
  validRedirect,
  clientSchema,
  effectiveName,
  changeSchema,
} from "./contracts";
import {
  qualificationPlan,
  qualificationSchema,
} from "@/lib/crm/qualification";
import type { LeadOpportunityRecord } from "@/lib/crm/types";
test("OAuth requires exact HTTPS callbacks and S256 proof without accepting weaker methods", () => {
  const verifier = "v".repeat(43),
    challenge = createHash("sha256").update(verifier).digest("base64url");
  assert.equal(validPkce(verifier, challenge), true);
  assert.equal(validPkce("a".repeat(43), challenge), false);
  assert.equal(validPkce("short", challenge), false);
  for (const uri of [
    "http://example.com/callback",
    "https://user:secret@example.com/callback",
    "https://example.com/callback#token",
    "javascript:alert(1)",
  ])
    assert.equal(validRedirect(uri), false);
  assert.equal(validRedirect("https://claude.ai/api/mcp/auth_callback"), true);
  assert.equal(
    clientSchema.safeParse({
      client_name: "AI",
      redirect_uris: ["https://example.com/callback"],
      token_endpoint_auth_method: "unsupported",
    }).success,
    false,
  );
});
test("owner name lock overrides personal preferences without mutating other preferences", () => {
  assert.equal(
    effectiveName({ name: "Yapper", nameLocked: false }, "Atlas"),
    "Atlas",
  );
  assert.equal(
    effectiveName({ name: "Workspace assistant", nameLocked: true }, "Atlas"),
    "Workspace assistant",
  );
  assert.equal(
    effectiveName({ name: "Yapper", nameLocked: false }, null),
    "Yapper",
  );
});
test("AI change contract cannot record money, change access or issue arbitrary code", () => {
  for (const kind of ["payment", "sql", "permissions", "delete"])
    assert.equal(
      changeSchema.safeParse({ kind, leadId: crypto.randomUUID() }).success,
      false,
    );
  assert.equal(
    changeSchema.safeParse({
      kind: "note",
      leadId: crypto.randomUUID(),
      note: "Promised payment next week",
      paid: true,
    }).success,
    false,
  );
});
function offer(
  id: string,
  label: string,
  status: LeadOpportunityRecord["status"],
): LeadOpportunityRecord {
  return {
    id,
    offerLabel: label,
    status,
    estimatedValue: 1000,
    expectedValue: 500,
    currency: "USD",
    closeProbability: 50,
    isPrimary: true,
    archivedAt: null,
  } as LeadOpportunityRecord;
}
test("unqualified one product preserves other offers and won/lost history", () => {
  const a = crypto.randomUUID(),
    b = crypto.randomUUID(),
    c = crypto.randomUUID();
  const rows = [
    offer(a, "Service", "qualified"),
    offer(b, "Enterprise", "active"),
    offer(c, "Historical sale", "won"),
  ];
  const one = qualificationSchema.parse({
    scope: "one",
    opportunityId: a,
    status: "unqualified",
    reason: "Budget",
  });
  const plan = qualificationPlan(rows, one);
  assert.equal(plan[0].status, "unqualified");
  assert.equal(plan[1].status, "active");
  assert.equal(plan[2].status, "won");
  const all = qualificationPlan(rows, {
    scope: "all",
    status: "unqualified",
    reason: "Timing",
  });
  assert.equal(all[1].status, "unqualified");
  assert.equal(all[2].status, "won");
});
test("qualification requires a product and reason, and copies preset values for new offers", () => {
  assert.equal(
    qualificationSchema.safeParse({
      scope: "one",
      status: "unqualified",
      reason: "Budget",
    }).success,
    false,
  );
  assert.equal(
    qualificationSchema.safeParse({ scope: "all", status: "unqualified" })
      .success,
    false,
  );
  const plan = qualificationPlan(
    [],
    {
      scope: "one",
      productId: crypto.randomUUID(),
      status: "qualified",
      reason: "",
    },
    { name: "Implementation", value: "2500", currency: "EUR", probability: 40 },
  );
  assert.equal(plan[0].estimatedValue, 2500);
  assert.equal(plan[0].currency, "EUR");
  assert.equal(plan[0].closeProbability, 40);
  assert.throws(() =>
    qualificationPlan([], {
      scope: "all",
      status: "unqualified",
      reason: "No fit",
    }),
  );
});
