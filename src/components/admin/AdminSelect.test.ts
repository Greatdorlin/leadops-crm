import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Circle } from "lucide-react";
import { AdminSelect } from "./AdminSelect";

test("AdminSelect renders one custom affordance and preserves the complete selected label", () => {
  const markup = renderToStaticMarkup(
    createElement(
      AdminSelect,
      { "aria-label": "Mass change type", value: "assign" },
      createElement("option", { value: "assign" }, "Assign owner"),
      createElement("option", { value: "stage" }, "Change stage"),
    ),
  );

  assert.equal(markup.match(/data-admin-select-affordance="true"/g)?.length, 1);
  assert.match(markup, />Assign owner</);
  assert.match(markup, /title="Assign owner"/);
  assert.equal(markup.match(/lucide-chevron-down/g)?.length, 1);
});

test("AdminSelect replaces rather than stacks the affordance when an icon is supplied", () => {
  const markup = renderToStaticMarkup(
    createElement(
      AdminSelect,
      { "aria-label": "Example", icon: createElement(Circle), value: "one" },
      createElement("option", { value: "one" }, "One"),
    ),
  );

  assert.equal(markup.match(/data-admin-select-affordance="true"/g)?.length, 1);
  assert.doesNotMatch(markup, /lucide-chevron-down/);
  assert.equal(markup.match(/lucide-circle/g)?.length, 1);
});
