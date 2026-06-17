import assert from "node:assert/strict";
import test from "node:test";
import { buildLeadDisplayNameMap, formatLeadBaseName } from "./lead-identity";

test("formatLeadBaseName falls back to Lead when the first name is missing", () => {
  assert.equal(
    formatLeadBaseName({
      firstName: "",
      lastName: "Kanu",
    }),
    "Lead Kanu",
  );
});

test("buildLeadDisplayNameMap adds suffixes only when visible names collide", () => {
  const displayNames = buildLeadDisplayNameMap([
    {
      id: "lead-1",
      firstName: "Joseph",
      lastName: "Kanu",
    },
    {
      id: "lead-2",
      firstName: "Joseph",
      lastName: "Kanu",
    },
    {
      id: "lead-3",
      firstName: "Amara",
      lastName: "Okafor",
    },
  ]);

  assert.equal(displayNames["lead-1"], "Joseph Kanu 1");
  assert.equal(displayNames["lead-2"], "Joseph Kanu 2");
  assert.equal(displayNames["lead-3"], "Amara Okafor");
});
