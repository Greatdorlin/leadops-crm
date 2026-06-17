import type { AssessmentAnswers, AssessmentStepKey } from "@/lib/pathway-engine/types";

interface SaveDraftInput {
  leadId?: string | null;
  answers: AssessmentAnswers;
  currentStepKey: AssessmentStepKey;
  currentStepIndex: number;
  progressPercent: number;
}

export async function saveAssessmentDraft(input: SaveDraftInput) {
  const response = await fetch("/api/assessment/draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("We couldn't save your progress right now.");
  }

  const payload = await response.json();
  return payload as {
    leadId: string;
    completionStatus: string;
    progressPercent: number;
  };
}
