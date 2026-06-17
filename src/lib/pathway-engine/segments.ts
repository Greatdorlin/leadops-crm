import type { AssessmentAnswers, LeadSegment, PathwayScore } from "./types";

export function getLeadSegment(
  answers: AssessmentAnswers,
  topScores: PathwayScore[],
): LeadSegment {
  const primary = topScores[0]?.score ?? 0;

  if (answers.wantsHumanSupport || answers.previousRefusal === "yes" || primary >= 80) {
    return "Consultation priority";
  }

  if (answers.timeline === "immediately" || answers.timeline === "3_6_months" || primary >= 65) {
    return "High-intent nurturance";
  }

  if (
    answers.fundingReadiness === "lowest_cost" ||
    answers.passportStatus === "no_passport" ||
    answers.studyFundingReadiness === "scholarship_support"
  ) {
    return "Preparation-first";
  }

  return "Explorer";
}
