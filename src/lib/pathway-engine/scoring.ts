import { PATHWAYS } from "./pathways";
import { deriveSignals } from "./signals";
import type { AssessmentAnswers, PathwayId, PathwayScore, ScoreLabel } from "./types";

const baseScores: Record<PathwayId, number> = {
  passport_readiness: 12,
  skilled_work_preparation: 18,
  study_to_work: 18,
  employer_sponsored: 16,
  scholarship_funded_study: 14,
  tourism_visitor: 14,
  business_trade_travel: 14,
  conference_event_travel: 12,
  family_dependent: 12,
  digital_talent_tech: 10,
  healthcare_care: 10,
  entrepreneur_investment: 10,
  low_budget_preparation: 12,
  exploration_not_sure: 10,
};

function scoreLabel(score: number): ScoreLabel {
  if (score >= 80) return "Strong fit";
  if (score >= 65) return "Promising fit";
  if (score >= 45) return "Possible fit";
  if (score >= 25) return "Early-stage fit";
  return "Not a priority now";
}

function boost(scores: Record<PathwayId, number>, id: PathwayId, amount: number) {
  scores[id] += amount;
}

function dampen(scores: Record<PathwayId, number>, ids: PathwayId[], amount: number) {
  ids.forEach((id) => {
    scores[id] -= amount;
  });
}

export function scorePathways(answers: AssessmentAnswers): PathwayScore[] {
  const signals = deriveSignals(answers);
  const scores: Record<PathwayId, number> = { ...baseScores };

  switch (answers.primaryGoal) {
    case "study_abroad":
      boost(scores, "study_to_work", 34);
      boost(scores, "scholarship_funded_study", 20);
      boost(scores, "low_budget_preparation", 12);
      break;
    case "work_and_relocate":
      boost(scores, "skilled_work_preparation", 32);
      boost(scores, "employer_sponsored", 26);
      if (answers.workField === "tech") boost(scores, "digital_talent_tech", 28);
      if (answers.workField === "healthcare") boost(scores, "healthcare_care", 28);
      break;
    case "business_abroad":
      boost(scores, "business_trade_travel", 34);
      boost(scores, "conference_event_travel", 18);
      boost(scores, "entrepreneur_investment", 18);
      break;
    case "visit_or_tour":
      boost(scores, "tourism_visitor", 34);
      boost(scores, "passport_readiness", 8);
      break;
    case "event_travel":
      boost(scores, "conference_event_travel", 34);
      boost(scores, "business_trade_travel", 16);
      break;
    case "family_relocation":
      boost(scores, "family_dependent", 34);
      boost(scores, "study_to_work", 10);
      boost(scores, "skilled_work_preparation", 10);
      break;
    case "not_sure_yet":
      boost(scores, "exploration_not_sure", 34);
      break;
    default:
      break;
  }

  if (signals.passportMissing) {
    boost(scores, "passport_readiness", 30);
    dampen(
      scores,
      [
        "study_to_work",
        "employer_sponsored",
        "tourism_visitor",
        "business_trade_travel",
        "conference_event_travel",
        "family_dependent",
      ],
      8,
    );
  }

  if (signals.passportExpiringSoon) {
    boost(scores, "passport_readiness", 10);
    dampen(scores, ["tourism_visitor", "conference_event_travel", "business_trade_travel"], 4);
  }

  if (signals.lowBudgetFocus) {
    boost(scores, "low_budget_preparation", 24);
    boost(scores, "employer_sponsored", 14);
    boost(scores, "scholarship_funded_study", 16);
  }

  if (signals.needsScholarship) {
    boost(scores, "scholarship_funded_study", 18);
    dampen(scores, ["entrepreneur_investment", "tourism_visitor"], 8);
  }

  if (signals.languageTestMissing) {
    boost(scores, "skilled_work_preparation", 12);
    dampen(scores, ["employer_sponsored", "study_to_work"], 6);
  }

  if (signals.languageTestReady) {
    boost(scores, "employer_sponsored", 8);
    boost(scores, "study_to_work", 6);
  }

  if (signals.urgentTimeline && signals.passportMissing) {
    boost(scores, "passport_readiness", 10);
    dampen(scores, ["tourism_visitor", "conference_event_travel"], 8);
  }

  if (signals.priorRefusal) {
    boost(scores, "low_budget_preparation", 8);
    boost(scores, "passport_readiness", 6);
  }

  if (signals.familyMode && answers.familyOpenPathway === "family_route") {
    boost(scores, "family_dependent", 12);
  }

  if (signals.businessMode && answers.businessStage === "registered_company") {
    boost(scores, "entrepreneur_investment", 12);
  }

  if (signals.exploringMode) {
    boost(scores, "exploration_not_sure", 18);
  }

  if (!signals.destinationKnown) {
    boost(scores, "exploration_not_sure", 10);
    dampen(scores, ["tourism_visitor", "conference_event_travel", "business_trade_travel"], 3);
  }

  return Object.values(PATHWAYS)
    .map((pathway) => {
      const score = Math.max(0, Math.min(100, Math.round(scores[pathway.id])));
      return {
        id: pathway.id,
        score,
        label: scoreLabel(score),
      };
    })
    .sort((left, right) => right.score - left.score);
}
