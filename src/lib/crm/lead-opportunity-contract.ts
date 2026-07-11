import type { LeadOpportunityRecord, LeadOpportunityStatus } from "@/lib/crm/types";

export const LEAD_OPPORTUNITY_STATUSES = [
  "active",
  "qualified",
  "unqualified",
  "lost",
  "won",
  "on_hold",
] as const;

const PIPELINE_OPPORTUNITY_STATUSES = new Set<LeadOpportunityStatus>([
  "active",
  "qualified",
  "on_hold",
]);

const WON_OPPORTUNITY_STATUSES = new Set<LeadOpportunityStatus>(["won"]);

export interface LeadOpportunityRollup {
  estimatedValue: number | null;
  expectedValue: number | null;
  closeProbability: number | null;
  wonValue: number | null;
  expectedCloseDate: string | null;
  lostReason: string | null;
  activeCount: number;
  qualifiedCount: number;
  inactiveCount: number;
  wonCount: number;
  summaryLabel: string;
}

function roundMoney(value: number) {
  return Number.parseFloat(value.toFixed(2));
}

export function calculateExpectedValue(
  estimatedValue?: number | null,
  closeProbability?: number | null,
) {
  if (
    estimatedValue === null ||
    estimatedValue === undefined ||
    closeProbability === null ||
    closeProbability === undefined
  ) {
    return null;
  }

  return roundMoney((estimatedValue * closeProbability) / 100);
}

function buildSummaryLabel(input: {
  activeCount: number;
  qualifiedCount: number;
  inactiveCount: number;
  wonCount: number;
}) {
  const parts = [
    input.activeCount > 0 ? `${input.activeCount} active` : null,
    input.qualifiedCount > 0 ? `${input.qualifiedCount} qualified` : null,
    input.wonCount > 0 ? `${input.wonCount} won` : null,
    input.inactiveCount > 0 ? `${input.inactiveCount} removed from pipeline` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "No offer opportunities yet";
}

export function buildLeadOpportunityRollup(
  opportunities: Array<
    Pick<
      LeadOpportunityRecord,
      | "status"
      | "estimatedValue"
      | "expectedValue"
      | "closeProbability"
      | "expectedCloseDate"
      | "reason"
    >
  >,
): LeadOpportunityRollup {
  let estimatedValueTotal = 0;
  let expectedValueTotal = 0;
  let wonValueTotal = 0;
  let activeCount = 0;
  let qualifiedCount = 0;
  let inactiveCount = 0;
  let wonCount = 0;
  let earliestExpectedCloseDate: string | null = null;
  let primaryInactiveReason: string | null = null;

  for (const opportunity of opportunities) {
    const expectedValue =
      opportunity.expectedValue ??
      calculateExpectedValue(opportunity.estimatedValue, opportunity.closeProbability);

    if (PIPELINE_OPPORTUNITY_STATUSES.has(opportunity.status)) {
      activeCount += 1;
      if (opportunity.status === "qualified") {
        qualifiedCount += 1;
      }

      estimatedValueTotal += opportunity.estimatedValue ?? 0;
      expectedValueTotal += expectedValue ?? opportunity.estimatedValue ?? 0;

      if (
        opportunity.expectedCloseDate &&
        (!earliestExpectedCloseDate ||
          new Date(opportunity.expectedCloseDate).getTime() <
            new Date(earliestExpectedCloseDate).getTime())
      ) {
        earliestExpectedCloseDate = opportunity.expectedCloseDate;
      }

      continue;
    }

    if (WON_OPPORTUNITY_STATUSES.has(opportunity.status)) {
      wonCount += 1;
      wonValueTotal += opportunity.estimatedValue ?? expectedValue ?? 0;
      continue;
    }

    inactiveCount += 1;
    if (!primaryInactiveReason && opportunity.reason) {
      primaryInactiveReason = opportunity.reason;
    }
  }

  const estimatedValue = estimatedValueTotal > 0 ? roundMoney(estimatedValueTotal) : null;
  const expectedValue = expectedValueTotal > 0 ? roundMoney(expectedValueTotal) : null;
  const wonValue = wonValueTotal > 0 ? roundMoney(wonValueTotal) : null;
  const closeProbability =
    estimatedValue && expectedValue
      ? Math.max(0, Math.min(100, Math.round((expectedValue / estimatedValue) * 100)))
      : null;

  return {
    estimatedValue,
    expectedValue,
    closeProbability,
    wonValue,
    expectedCloseDate: earliestExpectedCloseDate,
    lostReason:
      activeCount === 0 && wonCount === 0 && inactiveCount > 0 ? primaryInactiveReason : null,
    activeCount,
    qualifiedCount,
    inactiveCount,
    wonCount,
    summaryLabel: buildSummaryLabel({
      activeCount,
      qualifiedCount,
      inactiveCount,
      wonCount,
    }),
  };
}
