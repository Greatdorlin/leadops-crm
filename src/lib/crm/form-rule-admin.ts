import "server-only";

import { LEAD_PRIORITIES } from "@/lib/crm/constants";
import { listLeadSources } from "@/lib/crm/lead-sources-admin";
import { buildFormDefaultSourceOptions } from "@/lib/crm/form-default-source-options";
import { listLeadStages } from "@/lib/crm/lead-stages-admin";
import {
  OPPORTUNITY_RULE_STATUSES,
  type SubmissionRuleAction,
} from "@/lib/crm/form-submission-routing";
import { leadStore } from "@/lib/storage";

export class FormRuleAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormRuleAdminError";
  }
}

export async function resolveFormRuleActionValue(
  actionType: SubmissionRuleAction,
  actionValue: string,
) {
  const value = actionValue.trim();

  if (actionType === "set_stage" || actionType === "set_status") {
    const stages = await listLeadStages();
    const stage = stages.find(
      (candidate) => !candidate.archived && (candidate.id === value || candidate.key === value),
    );
    if (!stage) {
      throw new FormRuleAdminError("Choose an active lead stage.");
    }
    return stage.key;
  }

  if (actionType === "set_priority") {
    if (!LEAD_PRIORITIES.includes(value as (typeof LEAD_PRIORITIES)[number])) {
      throw new FormRuleAdminError("Choose a valid lead priority.");
    }
    return value;
  }

  if (actionType === "set_source") {
    const sources = await listLeadSources();
    const source = buildFormDefaultSourceOptions(sources).find(
      (candidate) => candidate.value === value,
    );
    if (!source) {
      throw new FormRuleAdminError("Choose an active lead source.");
    }
    return source.value;
  }

  if (actionType === "set_opportunity_status") {
    if (!OPPORTUNITY_RULE_STATUSES.includes(value as (typeof OPPORTUNITY_RULE_STATUSES)[number])) {
      throw new FormRuleAdminError("Choose a valid offer status.");
    }
    return value;
  }

  if (actionType === "set_opportunity_value") {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new FormRuleAdminError("Potential value must be zero or greater.");
    }
    return String(amount);
  }

  if (actionType !== "set_owner") {
    throw new FormRuleAdminError("Choose a supported rule action.");
  }

  const user =
    (await leadStore.getCrmUserById(value)) ??
    (await leadStore.getCrmUserByEmail(value));
  if (!user?.isActive) {
    throw new FormRuleAdminError("Choose an active workspace owner.");
  }
  return user.id;
}
