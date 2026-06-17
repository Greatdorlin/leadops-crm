import type { GoalWaitlistRecord } from "../waitlist/types";

interface WaitlistSenderPayload {
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
  groups: string[];
  trigger_automation: boolean;
  fields: Record<string, string>;
}

interface WaitlistSenderResult {
  ok: boolean;
  error?: string;
}

const WAITLIST_GROUP_ENV_BY_GOAL: Partial<Record<GoalWaitlistRecord["goalValue"], string>> = {
  work_and_relocate: "SENDER_WAITLIST_GROUP_ID_WORK_RELOCATE",
  family_relocation: "SENDER_WAITLIST_GROUP_ID_WORK_RELOCATE",
  visit_or_tour: "SENDER_WAITLIST_GROUP_ID_VISIT_TOURISM",
  business_abroad: "SENDER_WAITLIST_GROUP_ID_BUSINESS_TRAVEL",
};

function getWaitlistGroupId(goalValue: GoalWaitlistRecord["goalValue"]) {
  const envKey = WAITLIST_GROUP_ENV_BY_GOAL[goalValue];

  if (!envKey) {
    return null;
  }

  return process.env[envKey] ?? null;
}

function mapWaitlistToSender(
  record: GoalWaitlistRecord,
  groupId: string,
): WaitlistSenderPayload {
  return {
    email: record.email,
    firstname: record.firstName,
    lastname: "",
    phone: record.whatsappNumber,
    groups: [groupId],
    trigger_automation: false,
    fields: {
      pathway_goal: record.goalValue,
      pathway_goal_label: record.goalLabel,
      source: record.source,
      waitlist_interest: "true",
    },
  };
}

export async function syncWaitlistToSender(
  record: GoalWaitlistRecord,
): Promise<WaitlistSenderResult> {
  const apiKey = process.env.SENDER_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      error: "Sender API key is not configured.",
    };
  }

  const groupId = getWaitlistGroupId(record.goalValue);

  if (!groupId) {
    return {
      ok: false,
      error: `Sender waitlist group is not configured for ${record.goalLabel}.`,
    };
  }

  try {
    const response = await fetch("https://api.sender.net/v2/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mapWaitlistToSender(record, groupId)),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Sender responded with ${response.status}.`,
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Unable to reach Sender right now.",
    };
  }
}
