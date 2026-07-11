import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryForNotificationType,
  notificationTypesForCategory,
  parseNotificationCategory,
} from "@/lib/crm/notification-categories";
import {
  decodeNotificationCursor,
  encodeNotificationCursor,
} from "@/lib/crm/notification-pagination";

test("notification categories keep action, pipeline, intake, and system events separate", () => {
  assert.equal(categoryForNotificationType("follow_up_overdue"), "action");
  assert.equal(categoryForNotificationType("lead_marked_won"), "pipeline");
  assert.equal(categoryForNotificationType("webhook_lead_captured"), "intake");
  assert.equal(categoryForNotificationType("export_completed"), "system");
  assert.equal(notificationTypesForCategory("all"), undefined);
  assert.equal(parseNotificationCategory("unknown"), "all");
});

test("notification cursors round-trip and reject malformed input", () => {
  const value = {
    createdAt: "2026-07-11T08:30:00.000Z",
    id: "11111111-1111-4111-8111-111111111111",
  };
  assert.deepEqual(decodeNotificationCursor(encodeNotificationCursor(value)), value);
  assert.equal(decodeNotificationCursor("not-a-cursor"), null);
});
