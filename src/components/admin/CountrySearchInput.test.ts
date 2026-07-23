import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CountrySearchInput } from "./CountrySearchInput";

test("CountrySearchInput owns exactly one trailing dropdown affordance", () => {
  const markup = renderToStaticMarkup(
    createElement(CountrySearchInput, {
      value: "Nigeria",
      onChange: () => undefined,
    }),
  );

  assert.equal(markup.match(/data-location-trigger-affordance="true"/g)?.length, 1);
  assert.equal(markup.match(/data-location-trigger="true"/g)?.length, 1);
  assert.equal(markup.match(/lucide-chevron-down/g)?.length, 1);
  assert.match(markup, /aria-label="Country\. Nigeria"/);
});
