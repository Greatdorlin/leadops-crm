import { PATHWAYS } from "./pathways";
import {
  isCanadaLoanAgeEligible,
  requestedScholarshipButNotEligible,
  resolveStudyFundingProfile,
} from "./support-rules";
import type {
  AssessmentAnswers,
  LeadSegment,
  PathwayMatch,
  PublicStudyGuidance,
  ReadinessLevel,
  ReportBlocker,
} from "./types";

const DESTINATION_LABELS: Record<string, string> = {
  uk: "United Kingdom",
  canada: "Canada",
  france: "France",
  new_zealand: "New Zealand",
};

const STUDY_LEVEL_LABELS: Record<string, string> = {
  undergraduate: "undergraduate study",
  postgraduate: "Masters or PhD study",
  diploma_foundation: "diploma or foundation study",
  professional_course: "professional study",
};

const EDUCATION_LABELS: Record<string, string> = {
  secondary_school: "a secondary-school background",
  ond_nce_diploma: "an OND, NCE, or diploma background",
  hnd_lower_credit: "an HND lower-credit result",
  hnd_upper_credit: "an HND upper-credit result",
  hnd: "an HND background",
  third_class: "a third-class bachelor's degree",
  second_class_lower: "a 2:2 bachelor's degree",
  second_class_upper: "a 2:1 bachelor's degree",
  first_class: "a first-class bachelor's degree",
  bachelors: "a bachelor's degree",
  masters: "a master's degree",
  phd: "a PhD background",
  professional_certification: "a professional certification background",
};

function trimEnding(value: string) {
  return value.trim().replace(/[.]+$/g, "");
}

function formatDestination(value: string | null | undefined) {
  if (!value || value === "not_sure") {
    return "your preferred destination";
  }

  return DESTINATION_LABELS[value] ?? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStudyLevelLabel(answers: AssessmentAnswers) {
  return STUDY_LEVEL_LABELS[answers.studyLevel ?? ""] ?? "study";
}

function getEducationLabel(answers: AssessmentAnswers) {
  return EDUCATION_LABELS[answers.highestEducation ?? ""] ?? "your academic background";
}

function needsStudyFundingSupport(answers: AssessmentAnswers) {
  return (
    resolveStudyFundingProfile(answers) === "scholarship" ||
    resolveStudyFundingProfile(answers) === "support_needed" ||
    answers.studyFundingReadiness === "application_costs" ||
    answers.studyFundingReadiness === "payment_plan" ||
    answers.studyFundingReadiness === "lowest_cost"
  );
}

function needsLanguagePreparation(answers: AssessmentAnswers) {
  return answers.languageTestStatus === "not_taken" || answers.languageTestStatus === "not_sure";
}

function getStudyPlanningSignal(answers: AssessmentAnswers, guidance: PublicStudyGuidance) {
  if (requestedScholarshipButNotEligible(answers) && guidance.country === "uk") {
    return "The grounded read is that UK scholarship review is currently reserved for 2:1 and first-class profiles, so the realistic support route to compare first is the UK loan-backed option.";
  }

  if (requestedScholarshipButNotEligible(answers) && guidance.country === "canada") {
    return isCanadaLoanAgeEligible(answers)
      ? "The grounded read is that scholarship is not the current fit here, so the realistic support route to compare is the Canada loan option for applicants aged 18 to 33."
      : "The grounded read is that scholarship is not the current fit here and the Canada loan window is limited to ages 18 to 33, so the funding plan needs a different route before this becomes dependable.";
  }

  if (guidance.biggestBlocker) {
    return `The first thing to sort out is ${trimEnding(guidance.biggestBlocker).toLowerCase()}.`;
  }

  if (needsStudyFundingSupport(answers)) {
    return "The next priority is making the funding plan strong enough before you move into applications.";
  }

  if (needsLanguagePreparation(answers)) {
    return "The next priority is booking your language test early enough to protect your timeline.";
  }

  return "There is no single blocker here that immediately knocks the route off course, so the main task is sequencing the next steps well.";
}

export const REPORT_DISCLAIMER =
  "This report is based on the answers you submitted. It is for planning and review only, not a guarantee of admission, visa, scholarship, loan, or final approval. Requirements can change, so confirm the final route with a qualified Fly Connect advisor before making major decisions.";

export function getReadinessLevel(
  answers: AssessmentAnswers,
  blockers: ReportBlocker[],
  primaryScore: number,
): ReadinessLevel {
  if (answers.passportStatus === "no_passport" || primaryScore < 45 || blockers.length >= 3) {
    return "Foundation";
  }
  if (primaryScore < 65) {
    return "Emerging";
  }
  if (primaryScore < 80) {
    return "Advancing";
  }
  return "Action-ready";
}

export function getReadinessSummary(level: ReadinessLevel, blockers: ReportBlocker[]) {
  const blockerText =
    blockers.length > 0
      ? `Right now, ${blockers.length} practical blocker${blockers.length > 1 ? "s are" : " is"} still standing between you and smooth execution.`
      : "Right now, your route has fewer immediate blockers than many first-time applicants.";

  switch (level) {
    case "Foundation":
      return `You have a real direction, but the file is still in build mode. This is the stage for steady preparation, not rushed commitments. ${blockerText}`;
    case "Emerging":
      return `The route is starting to make practical sense, but it still needs stronger proof points before it becomes a confident move. ${blockerText}`;
    case "Advancing":
      return "The route now looks workable. The main job is sequencing documentation, timing, and follow-through so a good plan does not lose momentum.";
    case "Action-ready":
      return "You are closer to execution than most early-stage applicants. The focus now is careful submissions, clean paperwork, and disciplined follow-through rather than starting over.";
  }
}

export function getFirstPracticalStep(blockers: ReportBlocker[], primaryMatch: PathwayMatch) {
  if (blockers.length > 0) {
    return `Start by resolving "${blockers[0].title}" before you move deeper into the ${primaryMatch.title.toLowerCase()} route.`;
  }

  return `Start by validating the first milestone in the ${primaryMatch.title.toLowerCase()} route and confirming that your documents, timing, and route conditions are aligned.`;
}

export function getSummaryDiagnosis(
  answers: AssessmentAnswers,
  primaryMatch: PathwayMatch,
  blockers: ReportBlocker[],
) {
  const name = answers.firstName || "Traveler";
  const destination =
    answers.destinationInterest && answers.destinationInterest !== "not_sure"
      ? ` for ${answers.destinationInterest.replaceAll("_", " ")}`
      : "";
  const blockerNote =
    blockers.length > 0
      ? `The first issue to settle is ${blockers[0].title.toLowerCase()}, because that is the point most likely to slow everything else down.`
      : "There is no single blocker here that immediately knocks the route off course, which gives you more room to move deliberately.";

  return `${name}, based on what you shared, the ${primaryMatch.title.toLowerCase()} route${destination} is the strongest fit right now. It stands out because your goals, readiness signals, and timing line up more clearly with this path than with the alternatives in the report. ${blockerNote}`;
}

export function getStudySummaryDiagnosis(
  answers: AssessmentAnswers,
  guidance: PublicStudyGuidance,
) {
  const name = answers.firstName || "Traveler";
  const destination = formatDestination(answers.destinationInterest ?? guidance.country);
  const studyLevel = getStudyLevelLabel(answers);
  const education = getEducationLabel(answers);
  const blockerNote = getStudyPlanningSignal(answers, guidance);

  return `${name}, the clearest route for you right now is ${guidance.publicPathwayName} in ${guidance.publicLocation}. It stands out because your ${destination} goal, ${education}, and ${studyLevel} direction line up more cleanly with this route than the alternatives. ${blockerNote}`;
}

export function humanizeStudyGuidance(
  answers: AssessmentAnswers,
  guidance: PublicStudyGuidance,
): PublicStudyGuidance {
  const destination = formatDestination(answers.destinationInterest ?? guidance.country);
  const studyLevel = getStudyLevelLabel(answers);
  const education = getEducationLabel(answers);
  const planningSignal = getStudyPlanningSignal(answers, guidance);
  const fundingSupport = needsStudyFundingSupport(answers);
  const languageSupport = needsLanguagePreparation(answers);
  const scholarshipFallback = requestedScholarshipButNotEligible(answers);
  const planningPriority = fundingSupport
    ? scholarshipFallback
      ? "loan, funding, and document planning"
      : "scholarship, funding, and document planning"
    : languageSupport
      ? "language-test timing and document planning"
      : "the next planning steps";

  const whyThisFits = [
    `${guidance.publicPathwayName} is a strong fit because you want ${studyLevel} in ${destination}, and this route keeps that goal focused instead of vague.`,
    `Your current profile points to ${education}, so this route should be reviewed against course relevance, transcripts, and entry criteria rather than guesswork.`,
    scholarshipFallback
      ? guidance.country === "uk"
        ? "Because scholarship does not currently fit the degree-class rule, the report should treat the UK loan-supported route as the realistic support plan from the start."
        : "Because scholarship does not currently fit the degree-class rule, the report should test the age-limited loan route before treating support as solved."
      : fundingSupport
        ? "Because funding support matters for you, this route should be reviewed with scholarship, loan, deposit, or payment-planning decisions in mind from the start."
      : languageSupport
        ? "Because language-test timing still matters here, this route works best when preparation starts early enough to avoid deadline pressure."
        : "Because your foundation is already clearer than many early-stage applicants, the next job is disciplined sequencing rather than starting over.",
  ];

  return {
    ...guidance,
    routeSummary: `${guidance.publicPathwayName} in ${guidance.publicLocation}`,
    fitSummary: getStudySummaryDiagnosis(answers, guidance),
    whyThisFits,
    publicRecommendation: scholarshipFallback
      ? `${guidance.publicPathwayName} is the best route to review first because your current degree class does not make scholarship the grounded support plan, and this keeps your ${destination} direction, qualification background, and ${planningPriority} aligned.`
      : `${guidance.publicPathwayName} is the best route to review first because it keeps your ${destination} direction, qualification background, and ${planningPriority} aligned.`,
    fitHighlights: [
      {
        title: "Destination fit",
        description: `You selected ${destination}, and this route is one of the clearest ways to pursue that direction without stretching your profile too early.`,
      },
      {
        title: "Academic fit",
        description: `Your current background suggests ${education}, so the next check is how well your transcripts and course history support this route.`,
      },
      {
        title: "Planning fit",
        description: trimEnding(planningSignal),
      },
    ],
  };
}

export function getWhyThesePathwaysFit(matches: PathwayMatch[], segment: LeadSegment) {
  return matches.map((match, index) => {
    const archetype = PATHWAYS[match.id];
    const segmentTail =
      segment === "Preparation-first"
        ? "What matters most here is sequencing the route well instead of moving too fast."
        : segment === "Consultation priority"
          ? "This is strong enough to explore seriously, but it deserves careful review before you make big decisions."
          : "This route becomes more convincing when your next actions stay focused.";

    return `${index + 1}. ${archetype.fitReason} ${segmentTail}`;
  });
}
