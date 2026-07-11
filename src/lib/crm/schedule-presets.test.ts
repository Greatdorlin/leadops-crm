import assert from "node:assert/strict";
import test from "node:test";
import {
  localDateTimeInputToIso,
  resolveQuickScheduleDate,
  toLocalDateTimeInputValue,
} from "@/lib/crm/schedule-presets";

test("quick schedule presets produce deterministic future dates", () => {
  const now = new Date(2026, 6, 11, 9, 30, 0, 0);

  assert.equal(resolveQuickScheduleDate("later_today", now).getHours(), 16);
  assert.equal(resolveQuickScheduleDate("tomorrow", now).getDate(), 12);
  assert.equal(resolveQuickScheduleDate("in_3_days", now).getDate(), 14);
  assert.equal(resolveQuickScheduleDate("next_week", now).getDate(), 18);
});

test("date-time controls round-trip a valid local value", () => {
  const input = toLocalDateTimeInputValue(new Date(2026, 6, 11, 14, 15));
  assert.equal(input, "2026-07-11T14:15");
  assert.equal(typeof localDateTimeInputToIso(input), "string");
  assert.equal(localDateTimeInputToIso("not-a-date"), null);
});
