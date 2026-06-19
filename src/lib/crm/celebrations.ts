import type { CrmStatus } from "@/lib/crm/types";

export type CelebrationIntensity = "soft" | "strong" | "burst";

export interface CelebrationMoment {
  title: string;
  message: string;
  intensity: CelebrationIntensity;
  badge: string;
}

const STAGE_PROGRESS_ORDER: CrmStatus[] = [
  "new",
  "contacted",
  "qualified",
  "consultation_booked",
  "application_started",
  "documents_pending",
  "payment_pending",
  "converted",
  "lost",
  "unresponsive",
  "unqualified",
  "closed",
];

function getStageRank(status: CrmStatus) {
  const index = STAGE_PROGRESS_ORDER.indexOf(status);
  return index === -1 ? 0 : index;
}

export function buildLeadStageCelebration(input: {
  previousStatus: CrmStatus;
  nextStatus: CrmStatus;
  stageLabel: string;
}) : CelebrationMoment | null {
  if (input.previousStatus === input.nextStatus) {
    return null;
  }

  if (input.nextStatus === "lost" || input.nextStatus === "unqualified" || input.nextStatus === "closed") {
    return null;
  }

  if (input.nextStatus === "converted") {
    return {
      title: "Lead converted",
      message: `${input.stageLabel} is complete. Celebrate the win and keep the next lead moving.`,
      intensity: "burst",
      badge: "Won",
    };
  }

  if (getStageRank(input.nextStatus) <= getStageRank(input.previousStatus)) {
    return null;
  }

  const strongStatuses = new Set<CrmStatus>(["qualified", "payment_pending"]);

  return {
    title: "Milestone reached",
    message: `This lead moved into ${input.stageLabel}. Keep the momentum with the next best follow-up.`,
    intensity: strongStatuses.has(input.nextStatus) ? "strong" : "soft",
    badge: input.stageLabel,
  };
}

export function buildTargetCelebration(input: {
  targetName: string;
  progressPercent: number;
  wonValueLabel: string;
}) : CelebrationMoment | null {
  if (input.progressPercent < 100) {
    return null;
  }

  return {
    title: "Goal reached",
    message: `${input.targetName} is complete at ${input.wonValueLabel}. Keep the pace while the team is hot.`,
    intensity: "burst",
    badge: "Target hit",
  };
}
