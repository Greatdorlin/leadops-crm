import assert from "node:assert/strict";
import test from "node:test";
import { formatCurrencyValue } from "@/lib/currency";

test("currency formatting falls back safely when workspace currency is missing", () => {
  assert.match(formatCurrencyValue(125000, ""), /125,000/);
  assert.doesNotThrow(() => formatCurrencyValue(125000, "not-a-currency"));
});

test("currency formatting supports both CFA currency families", () => {
  assert.match(formatCurrencyValue(250000, "XOF"), /250[\s,.]000|250000/);
  assert.match(formatCurrencyValue(250000, "XAF"), /250[\s,.]000|250000/);
});
