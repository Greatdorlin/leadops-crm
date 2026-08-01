import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAdminLeadProfilePayload } from "@/lib/crm/form-contracts";
import {
  buildLeadBusinessFieldChanges,
  buildLeadBusinessFieldUpdate,
} from "@/lib/crm/lead-business-fields";

const existing = {
  firstName: "Ada",
  lastName: "Okafor",
  email: "ada@example.com",
  whatsappNumber: "",
  callNumber: "",
  country: "Nigeria",
  region: "Lagos",
  city: "Ikeja",
  address: null,
  postalCode: null,
  companyName: "Analytical Engines",
  leadCustomerType: "business" as const,
  sourceId: "11111111-1111-4111-8111-111111111111",
  sourceDetail: "Conference desk",
  campaignLabel: "Spring launch",
  utmSource: "linkedin",
  utmMedium: "paid_social",
  utmCampaign: "spring_launch",
  utmContent: null,
  utmTerm: null,
  landingPage: "https://example.com/demo",
};

test("profile contract accepts business attribution but rejects system and rollup fields", () => {
  const parsed = normalizeAdminLeadProfilePayload({
    firstName: "Ada",
    email: "ada@example.com",
    sourceId: "22222222-2222-4222-8222-222222222222",
    campaignLabel: "Growth campaign",
    utmSource: "newsletter",
    estimatedValue: 9000,
    wonValue: 5000,
    campaignId: "external-campaign-id",
    externalLeadId: "external-lead-id",
    affiliateReferrerId: "33333333-3333-4333-8333-333333333333",
    createdAt: "2026-07-18T00:00:00.000Z",
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.sourceId, "22222222-2222-4222-8222-222222222222");
  assert.equal(parsed.data.campaignLabel, "Growth campaign");
  assert.equal(parsed.data.utmSource, "newsletter");
  assert.equal("estimatedValue" in parsed.data, false);
  assert.equal("wonValue" in parsed.data, false);
  assert.equal("campaignId" in parsed.data, false);
  assert.equal("externalLeadId" in parsed.data, false);
  assert.equal("affiliateReferrerId" in parsed.data, false);
  assert.equal("createdAt" in parsed.data, false);
});

test("business field updates preserve omitted fields and normalize edited text", () => {
  const next = buildLeadBusinessFieldUpdate(existing, {
    firstName: " Ada ",
    email: "ada@example.com",
    whatsappNumber: null,
    companyName: "  Difference Works  ",
    region: "  Abuja  ",
    sourceId: null,
    sourceDetail: " ",
    campaignLabel: "Customer summit",
    customFieldValues: {},
  });

  assert.equal(next.firstName, "Ada");
  assert.equal(next.companyName, "Difference Works");
  assert.equal(next.region, "Abuja");
  assert.equal(next.city, "Ikeja");
  assert.equal(next.sourceId, null);
  assert.equal(next.sourceDetail, null);
  assert.equal(next.campaignLabel, "Customer summit");
});

test("business field audit changes contain readable structured before and after values", () => {
  const next = { ...existing, companyName: "Difference Works", sourceId: null };
  const changes = buildLeadBusinessFieldChanges(existing, next, {
    before: "Event",
    after: null,
  });

  assert.deepEqual(changes, [
    {
      field: "companyName",
      label: "Company",
      before: "Analytical Engines",
      after: "Difference Works",
    },
    {
      field: "source",
      label: "Source",
      before: "Event",
      after: null,
    },
  ]);
});
