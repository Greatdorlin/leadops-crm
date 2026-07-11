import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCsvDocument,
  neutralizeSpreadsheetCell,
  sanitizeSpreadsheetValues,
} from "@/lib/crm/spreadsheet-export";

test("spreadsheet exports neutralize formula-like lead values", () => {
  assert.equal(neutralizeSpreadsheetCell("=HYPERLINK(\"bad\")"), "'=HYPERLINK(\"bad\")");
  assert.equal(neutralizeSpreadsheetCell("  +cmd"), "'  +cmd");
  assert.equal(neutralizeSpreadsheetCell("normal value"), "normal value");
  assert.deepEqual(sanitizeSpreadsheetValues([["@risk", 12]]), [["'@risk", "12"]]);
});

test("CSV output quotes separators and includes an Excel-compatible BOM", () => {
  const csv = buildCsvDocument([["Name", "Note"], ["Ada, Inc.", 'She said "yes"']]);
  assert.equal(csv.startsWith("\uFEFF"), true);
  assert.match(csv, /"Ada, Inc\."/);
  assert.match(csv, /"She said ""yes"""/);
});
