import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminDateTimeInput } from "./AdminDateTimeInput";

test("AdminDateTimeInput preserves its value without exposing the browser-native picker", () => {
  const markup = renderToStaticMarkup(
    createElement(AdminDateTimeInput, {
      "aria-label": "Follow-up date and time",
      pickerLabel: "Choose follow-up date and time",
      readOnly: true,
      value: "2026-07-21T14:30",
    }),
  );

  assert.match(markup, /type="text"/);
  assert.doesNotMatch(markup, /type="datetime-local"/);
  assert.match(markup, /data-date-time-trigger="true"/);
  assert.match(markup, /aria-label="Follow-up date and time"/);
  assert.match(markup, /Jul 21, 2026/);
  assert.match(markup, /value="2026-07-21T14:30"/);
});
