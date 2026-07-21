import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminDateTimeInput } from "./AdminDateTimeInput";

test("AdminDateTimeInput renders an accessible native date and time control", () => {
  const markup = renderToStaticMarkup(
    createElement(AdminDateTimeInput, {
      "aria-label": "Follow-up date and time",
      pickerLabel: "Choose follow-up date and time",
      readOnly: true,
      value: "2026-07-21T14:30",
    }),
  );

  assert.match(markup, /type="datetime-local"/);
  assert.match(markup, /aria-label="Follow-up date and time"/);
  assert.match(markup, /aria-label="Choose follow-up date and time"/);
  assert.match(markup, /value="2026-07-21T14:30"/);
});
