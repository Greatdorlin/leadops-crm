import { z } from "zod";
import { CRM_STATUSES, LEAD_PRIORITIES } from "@/lib/crm/constants";
import { buildLeadAssigneeList } from "@/lib/crm/lead-assignees";

const leadWorkflowSchema = z
  .object({
    stage: z.enum(CRM_STATUSES).optional(),
    stageId: z.string().uuid("Choose a valid lead stage.").optional(),
    priority: z.enum(LEAD_PRIORITIES).optional(),
    assignedTo: z.string().trim().email().nullable().optional(),
    assignedToList: z.array(z.string().trim().email()).max(50).optional(),
    nextFollowUpAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict()
  .refine((value) => !(value.stage && value.stageId), {
    message: "Choose one lead stage identifier.",
    path: ["stageId"],
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Choose at least one lead workflow change.",
  });

export type LeadWorkflowInput = z.infer<typeof leadWorkflowSchema>;

export function normalizeLeadWorkflowPayload(payload: unknown) {
  return leadWorkflowSchema.safeParse(payload);
}

export function buildLeadAssignmentPlan(input: {
  existingPrimary: string | null;
  existingAssignees: string[];
  requestedPrimary?: string | null;
  requestedAssignees?: string[];
  primaryWasProvided: boolean;
  assigneesWereProvided: boolean;
}) {
  if (!input.primaryWasProvided && !input.assigneesWereProvided) {
    return null;
  }

  const primary = input.primaryWasProvided
    ? input.requestedPrimary ?? null
    : input.existingPrimary;

  if (!primary) {
    return {
      primary: null,
      assignees: [] as string[],
    };
  }

  const secondaryAssignees = input.assigneesWereProvided
    ? input.requestedAssignees ?? []
    : input.existingAssignees.filter((email) => email !== input.existingPrimary);
  const assignees = buildLeadAssigneeList({
    primary,
    all: secondaryAssignees,
  });

  return {
    primary: assignees[0] ?? null,
    assignees,
  };
}

export function resolveLeadLifecycleTransition(input: {
  stage: string;
  stageIsWon: boolean;
  stageIsLost: boolean;
  existingWonAt?: string | null;
  existingLostAt?: string | null;
  now: string;
}) {
  const isWon = input.stageIsWon || input.stage === "converted";
  const isLost = input.stageIsLost || input.stage === "lost";

  if (isWon) {
    return {
      wonAt: input.existingWonAt ?? input.now,
      lostAt: null,
      lostReason: null,
      closesFollowUp: true,
    } as const;
  }

  if (isLost) {
    return {
      wonAt: null,
      lostAt: input.existingLostAt ?? input.now,
      closesFollowUp: true,
    } as const;
  }

  return {
    wonAt: null,
    lostAt: null,
    lostReason: null,
    closesFollowUp: input.stage === "closed",
  } as const;
}
