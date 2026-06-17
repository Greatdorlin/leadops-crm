import type { AssessmentAnswers, ReportBlocker } from "./types";
import { requestedScholarshipButNotEligible } from "./support-rules";

export function getBlockers(answers: AssessmentAnswers): ReportBlocker[] {
  const blockers: ReportBlocker[] = [];

  if (answers.passportStatus === "no_passport") {
    blockers.push({
      id: "passport_missing",
      title: "Passport readiness comes first",
      description:
        "Your report can still show pathway directions, but applications and bookings should wait until your passport is ready.",
      severity: "high",
    });
  }

  if (answers.passportValidity === "lt_6") {
    blockers.push({
      id: "passport_expiry",
      title: "Passport validity is too short for confident planning",
      description:
        "A short validity window can slow down or weaken otherwise reasonable next steps.",
      severity: "medium",
    });
  }

  if (
    answers.primaryGoal === "work_and_relocate" ||
    answers.primaryGoal === "study_abroad" ||
    answers.familyOpenPathway === "work_route" ||
    answers.familyOpenPathway === "study_route"
  ) {
    if (answers.languageTestStatus === "not_taken" || answers.languageTestStatus === "not_sure") {
      blockers.push({
        id: "language_test",
        title: "Language-test requirement needs confirmation",
        description:
          "This does not remove your options, but you need to confirm whether your route needs IELTS, PTE, TOEFL, Duolingo, or a valid waiver.",
        severity: "medium",
      });
    }
  }

  if (
    answers.fundingReadiness === "lowest_cost" ||
    answers.fundingReadiness === "need_support" ||
    answers.studyFundingReadiness === "loan_support" ||
    answers.studyFundingReadiness === "scholarship_support"
  ) {
    blockers.push({
      id: "funding_sensitivity",
      title: "Support route should be reviewed privately",
      description:
        "Because you asked for support, the next step should focus on the most realistic route before applications move forward.",
      severity: "medium",
    });
  }

  if (requestedScholarshipButNotEligible(answers)) {
    blockers.push({
      id: "scholarship_not_current_fit",
      title: "Scholarship is not the grounded support route right now",
      description:
        "Based on the current degree-class rule, scholarship planning should be treated cautiously and the report should compare realistic loan-backed alternatives instead.",
      severity: "medium",
    });
  }

  if (answers.previousRefusal === "yes") {
    blockers.push({
      id: "previous_refusal",
      title: "Previous refusal history needs a careful review",
      description:
        "This does not block progress, but the refusal reason should be reviewed carefully before a new application starts.",
      severity: "medium",
    });
  }

  if (
    !answers.destinationInterest ||
    answers.destinationInterest === "not_sure" ||
    answers.countryClarity === "need_recommendations"
  ) {
    blockers.push({
      id: "destination_clarity",
      title: "Destination direction is still broad",
      description:
        "A stronger country or region shortlist would make the pathway advice more precise and more actionable.",
      severity: "low",
    });
  }

  return blockers.slice(0, 4);
}
