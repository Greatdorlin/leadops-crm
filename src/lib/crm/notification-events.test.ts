import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAssignedLeadNotification,
  buildFollowUpNotification,
  buildLeadClosedNotification,
  buildLeadStageChangedNotification,
  buildWebhookLeadNotification,
  notifyNewLeadAssigned,
} from "@/lib/crm/notification-events";

test("notification builders keep sellable v1 copy short and action-oriented", () => {
  const assigned = buildAssignedLeadNotification({
    leadId: "lead-1",
    recipientUserId: "user-1",
    leadName: "Ada Okafor",
  });
  assert.equal(assigned.title, "New lead assigned");
  assert.equal(assigned.message, "Ada Okafor is now in your queue.");

  const webhook = buildWebhookLeadNotification({
    leadId: "lead-2",
    formSourceName: "Website Contact Form",
    leadName: "Bayo Musa",
  });
  assert.equal(webhook.title, "New webhook lead captured");
  assert.equal(webhook.message, "Bayo Musa arrived through Website Contact Form.");

  const followUp = buildFollowUpNotification({
    type: "follow_up_overdue",
    recipientUserId: "user-1",
    leadId: "lead-3",
    leadName: "Chika Obi",
    dueLabel: "today",
  });
  assert.equal(followUp.title, "Follow-up overdue");

  const stageChanged = buildLeadStageChangedNotification({
    recipientUserId: "user-1",
    leadId: "lead-4",
    leadName: "David Musa",
    stageLabel: "Qualified",
  });
  assert.equal(stageChanged.message, "David Musa moved to Qualified.");

  const lost = buildLeadClosedNotification({
    type: "lead_marked_lost",
    recipientUserId: "user-1",
    leadId: "lead-5",
    leadName: "Efe Nnamdi",
    reasonLabel: "Budget not approved",
  });
  assert.equal(lost.message, "Efe Nnamdi was marked lost. Reason: Budget not approved.");
});

test("assigned-lead notifications do not fire without a recipient", async () => {
  const result = await notifyNewLeadAssigned({
    leadId: "lead-1",
    recipientUserId: null,
    leadName: "Ada Okafor",
  });

  assert.equal(result, null);
});
