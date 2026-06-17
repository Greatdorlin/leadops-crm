import assert from "node:assert/strict";
import test from "node:test";
import { parseCsvText, parseLeadImportCsv } from "./csv";

test("parseCsvText keeps quoted commas and line breaks intact", () => {
  const rows = parseCsvText(
    [
      "first_name,email,notes",
      "\"Ada\",ada@example.com,\"Needs UK route, follows up next week\"",
      "\"Grace\",grace@example.com,\"Line one",
      "line two\"",
    ].join("\n"),
  );

  assert.deepEqual(rows, [
    ["first_name", "email", "notes"],
    ["Ada", "ada@example.com", "Needs UK route, follows up next week"],
    ["Grace", "grace@example.com", "Line one\nline two"],
  ]);
});

test("parseLeadImportCsv maps common sales headers into CRM rows", () => {
  const rows = parseLeadImportCsv(
    [
      "Full Name,Email Address,Phone,Stage,Priority,Owner,Source,Notes",
      "Ada Lovelace,ada@example.com,+2348012345678,consultation booked,high,rep@flyconnectglobal.com,website form,Requested fast callback",
    ].join("\n"),
  );

  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    rowNumber: 2,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    whatsappNumber: "+2348012345678",
    state: null,
    primaryGoal: null,
    crmStatus: "consultation_booked",
    priority: "high",
    assignedTo: "rep@flyconnectglobal.com",
    source: "website_form",
    sourceDetail: "Requested fast callback",
  });
});
