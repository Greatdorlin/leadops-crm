import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ONBOARDING_LOCALE,
  getWorkspaceLocaleSuggestion,
  isValidTimeZone,
  normalizeWorkspaceCurrency,
} from "./workspace-locale";

test("new workspace locale defaults are Nigerian and editable", () => {
  assert.deepEqual(DEFAULT_ONBOARDING_LOCALE, {
    country: "Nigeria",
    region: "Lagos",
    city: "Lagos",
    timeZone: "Africa/Lagos",
    currency: "NGN",
    locale: "en-NG",
  });
});

test("country selection provides coherent location and money defaults", () => {
  assert.deepEqual(getWorkspaceLocaleSuggestion("Ghana"), {
    country: "Ghana",
    region: "Greater Accra",
    city: "Accra",
    timeZone: "Africa/Accra",
    currency: "GHS",
    locale: "en-GH",
  });
});

test("workspace locale validation rejects invalid values safely", () => {
  assert.equal(isValidTimeZone("Africa/Lagos"), true);
  assert.equal(isValidTimeZone("Not/A_Time_Zone"), false);
  assert.equal(normalizeWorkspaceCurrency("ngn"), "NGN");
  assert.equal(normalizeWorkspaceCurrency("nope", "GBP"), "GBP");
});
