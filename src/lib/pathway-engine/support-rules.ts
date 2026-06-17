import type { AssessmentAnswers } from "./types";

export type StudyFundingProfile =
  | "scholarship"
  | "loan_support"
  | "support_needed"
  | "lean"
  | "self"
  | "neutral";

const UK_SCHOLARSHIP_QUALIFICATIONS = new Set([
  "second_class_upper",
  "first_class",
]);

const UK_LOAN_QUALIFICATIONS = new Set([
  "second_class_lower",
  "second_class_upper",
  "first_class",
  "hnd_lower_credit",
  "hnd_upper_credit",
  "third_class",
]);

const CANADA_LOAN_QUALIFICATIONS = new Set([
  "secondary_school",
  "ond_nce_diploma",
  "hnd_lower_credit",
  "hnd_upper_credit",
  "hnd",
]);

const CANADA_LOAN_AGE_RANGES = new Set([
  "18_24",
  "25_27",
  "28_33",
]);

export function wantsScholarshipReview(answers: AssessmentAnswers) {
  return answers.studyFundingReadiness === "scholarship_support";
}

export function wantsLoanSupportReview(answers: AssessmentAnswers) {
  return answers.studyFundingReadiness === "loan_support";
}

export function isUkScholarshipEligible(answers: AssessmentAnswers) {
  return UK_SCHOLARSHIP_QUALIFICATIONS.has(answers.highestEducation ?? "");
}

export function isUkLoanAcademicEligible(answers: AssessmentAnswers) {
  return UK_LOAN_QUALIFICATIONS.has(answers.highestEducation ?? "");
}

export function isCanadaLoanAgeEligible(answers: AssessmentAnswers) {
  return CANADA_LOAN_AGE_RANGES.has(answers.ageRange ?? "");
}

export function isCanadaLoanAcademicEligible(answers: AssessmentAnswers) {
  return CANADA_LOAN_QUALIFICATIONS.has(answers.highestEducation ?? "");
}

export function isCanadaLoanEligible(answers: AssessmentAnswers) {
  return (
    isCanadaLoanAgeEligible(answers) &&
    isCanadaLoanAcademicEligible(answers)
  );
}

export function requestedScholarshipButNotEligible(
  answers: AssessmentAnswers,
) {
  return wantsScholarshipReview(answers) && !isUkScholarshipEligible(answers);
}

export function resolveStudyFundingProfile(
  answers: AssessmentAnswers,
): StudyFundingProfile {
  const funding = answers.studyFundingReadiness ?? answers.fundingReadiness;

  if (funding === "scholarship_support") {
    return isUkScholarshipEligible(answers) ? "scholarship" : "support_needed";
  }

  if (funding === "loan_support") {
    return "loan_support";
  }

  if (funding === "lowest_cost" || funding === "need_support") {
    return "support_needed";
  }

  if (funding === "payment_plan" || funding === "cover_tests_docs") {
    return "lean";
  }

  if (
    funding === "self_fund" ||
    funding === "cover_travel_settlement" ||
    funding === "study_settlement_route"
  ) {
    return "self";
  }

  return "neutral";
}
