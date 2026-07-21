import assert from "node:assert/strict";
import test from "node:test";
import { convertCurrencyAmount, exchangeRateOverrideSchema, workspaceCurrencyChangeSchema } from "@/lib/crm/currency-exchange";

test("currency conversion changes the amount rather than relabelling it", () => {
  assert.equal(convertCurrencyAmount(100_000, 0.00065), 65);
  assert.notEqual(convertCurrencyAmount(100_000, 0.00065), 100_000);
});

test("currency conversion rounds stored money to two decimals", () => {
  assert.equal(convertCurrencyAmount(10.01, 1.5), 15.02);
});

test("currency changes and manual overrides reject unsafe rates", () => {
  assert.equal(workspaceCurrencyChangeSchema.safeParse({ globalCurrency: "USD", exchangeRate: 0 }).success, false);
  assert.equal(exchangeRateOverrideSchema.safeParse({ baseCurrency: "NGN", quoteCurrency: "NGN", rate: 1 }).success, false);
  assert.equal(exchangeRateOverrideSchema.safeParse({ baseCurrency: "NGN", quoteCurrency: "USD", rate: 0.00065 }).success, true);
});
