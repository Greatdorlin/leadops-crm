import assert from "node:assert/strict";
import test from "node:test";
import { buildLeadsDeskDefaultSeedPayload } from "@/lib/db/seed-defaults";

test("default seed payload contains expected stages, sources, and recommended custom fields", () => {
  const payload = buildLeadsDeskDefaultSeedPayload();

  assert.deepEqual(payload.stages.map((row) => row.key), [
    "new",
    "contacted",
    "follow_up",
    "qualified",
    "proposal",
    "won",
    "lost",
  ]);
  assert.deepEqual(payload.sources.map((row) => row.key), [
    "website",
    "wordpress_form",
    "facebook_ads",
    "google_ads",
    "tiktok_ads",
    "instagram",
    "referral",
    "call",
    "walk_in",
    "csv_import",
    "manual_entry",
    "other",
  ]);
  assert.deepEqual(payload.customFields.map((row) => row.key), [
    "budget",
    "interest",
    "preferred_contact_time",
    "urgency",
    "location",
    "form_notes",
  ]);
});

test("default seed payload builder is stable and idempotent", () => {
  const first = buildLeadsDeskDefaultSeedPayload();
  const second = buildLeadsDeskDefaultSeedPayload();

  assert.deepEqual(first, second);
});
