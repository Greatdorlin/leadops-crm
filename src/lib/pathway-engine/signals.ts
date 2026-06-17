import type { AssessmentAnswers, PathwaySignalSet } from "./types";
import { resolveStudyFundingProfile } from "./support-rules";

export function deriveSignals(answers: AssessmentAnswers): PathwaySignalSet {
  const fundingProfile = resolveStudyFundingProfile(answers);

  return {
    goal: answers.primaryGoal,
    destinationKnown:
      answers.countryClarity === "yes" ||
      answers.countryClarity === "few_options" ||
      Boolean(answers.destinationInterest && answers.destinationInterest !== "not_sure"),
    passportMissing: answers.passportStatus === "no_passport",
    passportExpiringSoon: answers.passportValidity === "lt_6",
    lowBudgetFocus:
      answers.fundingReadiness === "lowest_cost" ||
      answers.studyFundingReadiness === "scholarship_support" ||
      answers.unsurePriority === "lowest_cost",
    needsScholarship: fundingProfile === "scholarship",
    languageTestReady:
      answers.languageTestStatus === "valid_result" || answers.languageTestStatus === "booked",
    languageTestMissing:
      answers.languageTestStatus === "not_taken" || answers.languageTestStatus === "not_sure",
    urgentTimeline:
      answers.timeline === "immediately" || answers.visitTravelWindow === "asap",
    exploringMode:
      answers.primaryGoal === "not_sure_yet" ||
      answers.timeline === "exploring" ||
      answers.visitTravelWindow === "exploring",
    priorRefusal: answers.previousRefusal === "yes",
    workField: answers.workField,
    workExperienceYears: answers.workExperienceYears,
    familyMode: answers.primaryGoal === "family_relocation",
    businessMode: answers.primaryGoal === "business_abroad",
  };
}
