import { PATHWAYS } from "./pathways";
import {
  isCanadaLoanAgeEligible,
  requestedScholarshipButNotEligible,
  resolveStudyFundingProfile,
} from "./support-rules";
import type {
  ActionPlanTitle,
  ActionPlanWindow,
  AssessmentAnswers,
  PathwayId,
  PublicStudyGuidance,
  ReadinessLevel,
  ReportBlocker,
} from "./types";

function blockerStep(blockers: ReportBlocker[]) {
  const primaryBlocker = blockers[0];
  if (!primaryBlocker) {
    return "Turn your strongest route into a clear working plan so every next step supports one direction.";
  }

  return `Deal with "${primaryBlocker.title}" first so the rest of your plan is not built on a weak foundation.`;
}

function formatValue(value: string | null | undefined) {
  return (value ?? "").replaceAll("_", " ").trim();
}

function titleCase(value: string | null | undefined, fallback: string) {
  const normalized = formatValue(value);
  if (!normalized || normalized === "not sure") {
    return fallback;
  }

  const destinationLabels: Record<string, string> = {
    uk: "UK",
    usa: "USA",
    us: "US",
    "new zealand": "New Zealand",
  };

  if (destinationLabels[normalized]) {
    return destinationLabels[normalized];
  }

  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getDestinationLabel(answers: AssessmentAnswers) {
  return titleCase(answers.destinationInterest, "your target destination");
}

function needsPassportAttention(answers: AssessmentAnswers) {
  return answers.passportStatus === "no_passport" || answers.passportValidity === "6_12";
}

function needsLanguageSupport(answers: AssessmentAnswers) {
  return answers.languageTestStatus !== "valid_result";
}

function needsFundingSupport(answers: AssessmentAnswers) {
  return (
    resolveStudyFundingProfile(answers) === "support_needed" ||
    resolveStudyFundingProfile(answers) === "scholarship" ||
    answers.studyFundingReadiness === "application_costs" ||
    answers.fundingReadiness === "lowest_cost"
  );
}

function takeDistinctSteps(steps: Array<string | null | undefined>, limit = 4) {
  return Array.from(
    new Set(
      steps
        .map((step) => step?.trim())
        .filter((step): step is string => Boolean(step)),
    ),
  ).slice(0, limit);
}

function getRouteFocusStep(
  primaryPathway: PathwayId,
  answers: AssessmentAnswers,
  studyGuidance?: PublicStudyGuidance | null,
) {
  const destination = getDestinationLabel(answers);

  if (answers.primaryGoal === "study_abroad") {
    return studyGuidance
      ? `Shortlist ${destination} study options that match your level, funding position, and long-term plan.`
      : `Narrow your study shortlist in ${destination} so your route is built around realistic programmes, not broad guesses.`;
  }

  const pathwayStepMap: Record<PathwayId, string> = {
    passport_readiness:
      "Complete the passport application or renewal process before you spend energy on route-specific steps.",
    skilled_work_preparation:
      "Refine your CV, role targets, and destination logic so your work route starts looking specific and credible.",
    study_to_work:
      `Narrow your ${destination} study shortlist and connect it to the work outcome you want after graduation.`,
    employer_sponsored:
      "Focus on countries and occupations where employer backing is realistic, instead of carrying the whole route alone.",
    scholarship_funded_study:
      `Focus on ${destination} options where scholarships or structured support are part of the route, not an afterthought.`,
    tourism_visitor:
      "Tighten the travel purpose, timing, and evidence so this stays a credible visitor route rather than a rushed booking plan.",
    business_trade_travel:
      "Clarify the commercial purpose of the trip so the travel plan is tied to a real business outcome.",
    conference_event_travel:
      "Anchor the route around the exact event, invitation, and business reason for attending.",
    family_dependent:
      "Map the family route clearly so the strongest option reflects the real decision-makers and constraints at home.",
    digital_talent_tech:
      "Position your profile around the tech pathways that reward stronger evidence rather than broad untargeted job searching.",
    healthcare_care:
      "Tighten the destination and credential-readiness issues that matter most for healthcare-led movement.",
    entrepreneur_investment:
      "Pressure-test the business case, timing, and destination fit before building an entrepreneur-led route around it.",
    low_budget_preparation:
      "Sequence the leanest next steps first so you protect cash and avoid paying for moves that are still too early.",
    exploration_not_sure:
      "Reduce the route to a smaller set of realistic directions before you commit money or paperwork.",
  };

  return pathwayStepMap[primaryPathway];
}

function getEvidenceStep(answers: AssessmentAnswers, studyGuidance?: PublicStudyGuidance | null) {
  const destination = getDestinationLabel(answers);

  if (answers.previousRefusal === "yes") {
    return "Rebuild your document story carefully so any earlier refusal issue is answered with stronger evidence this time.";
  }

  if (needsPassportAttention(answers)) {
    return "Bring your passport and core identity documents up to date so later applications are not delayed by basics.";
  }

  if (answers.primaryGoal === "study_abroad") {
    return studyGuidance?.documentChecklist.length
      ? `Start gathering the academic and support documents your ${destination} route will rely on.`
      : `Organise your academic, identity, and support documents in one place so the ${destination} route can move without scrambling later.`;
  }

  return "Start gathering the evidence, invitations, and supporting documents the route will eventually depend on.";
}

function getFundingStep(answers: AssessmentAnswers) {
  const destination = getDestinationLabel(answers);

  if (requestedScholarshipButNotEligible(answers) && answers.destinationInterest === "uk") {
    return `Because UK scholarship review is currently limited to 2:1 and first-class profiles, use the UK loan-supported route as the realistic support plan for ${destination}.`;
  }

  if (requestedScholarshipButNotEligible(answers) && answers.destinationInterest === "canada") {
    return isCanadaLoanAgeEligible(answers)
      ? `Because scholarship is not the grounded fit here, confirm whether the Canada loan route for ages 18 to 33 is realistic for ${destination}.`
      : `Because scholarship is not the grounded fit here and Canada loan support is capped at ages 18 to 33, rebuild the funding plan before treating ${destination} as executable.`;
  }

  if (needsFundingSupport(answers)) {
    return `Finalise how you will fund the ${destination} route and identify the scholarship, loan, or support path that is actually realistic for your profile.`;
  }

  return `Protect your momentum by keeping funds available for the steps that matter most in ${destination}.`;
}

function getLanguageStep(answers: AssessmentAnswers) {
  if (!needsLanguageSupport(answers)) {
    return null;
  }

  return "Schedule your language test early enough to leave room for preparation or a retake if needed.";
}

function getReviewStep(answers: AssessmentAnswers, readinessLevel: ReadinessLevel) {
  const reviewNeed =
    readinessLevel === "Foundation" || readinessLevel === "Emerging"
      ? "before you lock anything in"
      : "before you submit anything major";

  if (answers.primaryGoal === "study_abroad") {
    return `Use a human route review ${reviewNeed} so your country, programme level, and funding plan stay aligned.`;
  }

  return `Use a human route review ${reviewNeed} so your documents, timing, and route logic stay credible.`;
}

function getVisaPrepStep(answers: AssessmentAnswers) {
  if (answers.primaryGoal !== "study_abroad") {
    return "Start mapping the visa or compliance paperwork early so it does not become the late-stage bottleneck.";
  }

  return `Begin visa preparation for ${getDestinationLabel(answers)} once your route, funding, and core documents are stable.`;
}

function getExecutionStep(answers: AssessmentAnswers, primaryPathway: PathwayId) {
  if (answers.primaryGoal === "study_abroad") {
    return `Move into applications only after your shortlist, funding plan, and core documents all support the same destination story.`;
  }

  return `Move into ${PATHWAYS[primaryPathway].title.toLowerCase()} execution only after the route evidence and timing make practical sense.`;
}

function buildStudyLongRangeSteps(
  answers: AssessmentAnswers,
  stage: "120-day plan" | "180-day plan",
) {
  const destination = getDestinationLabel(answers);

  if (stage === "120-day plan") {
    return takeDistinctSteps([
      `Finalise your funding strategy for ${destination}, including scholarships or support if you need them.`,
      requestedScholarshipButNotEligible(answers) && answers.destinationInterest === "uk"
        ? "Treat the UK loan-supported route as the cleaner support path unless a verified 2:1 or first-class result changes the scholarship conversation."
        : null,
      `Gather the academic, identity, and support documents needed for ${destination} applications.`,
      `Shortlist programmes and courses that fit your qualification level and long-term plan.`,
      getLanguageStep(answers) ?? `Begin visa preparation for ${destination} so the route stays ahead of deadlines.`,
    ]);
  }

  return takeDistinctSteps([
    `Submit the strongest applications once your shortlist and supporting evidence are complete.`,
    needsFundingSupport(answers)
      ? requestedScholarshipButNotEligible(answers)
        ? "Pursue the loan-backed or structured support route that still fits your age, documents, and country rules."
        : "Apply for scholarships or support opportunities that strengthen the route."
      : "Keep your proof-of-funds and payment timeline organised so the route does not stall at decision stage.",
    `Start the visa paperwork for ${destination} as soon as the application path becomes concrete.`,
    `Research housing, travel, and arrival planning so the move feels coordinated rather than rushed.`,
  ]);
}

function buildGeneralLongRangeSteps(
  primaryPathway: PathwayId,
  answers: AssessmentAnswers,
  stage: "120-day plan" | "180-day plan",
) {
  const routeName = PATHWAYS[primaryPathway].title.toLowerCase();

  if (stage === "120-day plan") {
    return takeDistinctSteps([
      `Finalise the evidence, funding, and timing assumptions behind your ${routeName} route.`,
      "Gather the core documents, confirmations, and supporting records the route will rely on.",
      "Lock the shortlist of destinations, employers, hosts, or event targets you will pursue.",
      getVisaPrepStep(answers),
    ]);
  }

  return takeDistinctSteps([
    `Submit the strongest applications, invitations, or route requests once the foundation is complete.`,
    "Complete any sponsor, employer, host, or institution follow-up required to keep the route moving.",
    getVisaPrepStep(answers),
    "Prepare your travel, arrival, or settlement logistics early enough to avoid rushed decisions.",
  ]);
}

export function getCurrentActionPlanTitle(
  answers: AssessmentAnswers,
  readinessLevel: ReadinessLevel,
): ActionPlanTitle {
  if (answers.passportStatus === "no_passport" || readinessLevel === "Foundation") {
    return "30-day plan";
  }

  if (readinessLevel === "Emerging" || answers.timeline === "immediately") {
    return "60-day plan";
  }

  if (readinessLevel === "Advancing") {
    return "90-day plan";
  }

  if (answers.timeline === "3_6_months") {
    return "120-day plan";
  }

  return "180-day plan";
}

export function getActionPlans({
  answers,
  primaryPathway,
  blockers,
  readinessLevel,
  studyGuidance,
}: {
  answers: AssessmentAnswers;
  primaryPathway: PathwayId;
  blockers: ReportBlocker[];
  readinessLevel: ReadinessLevel;
  studyGuidance?: PublicStudyGuidance | null;
}): ActionPlanWindow[] {
  const firstStep = blockerStep(blockers);
  const focusStep = getRouteFocusStep(primaryPathway, answers, studyGuidance);
  const evidenceStep = getEvidenceStep(answers, studyGuidance);
  const fundingStep = getFundingStep(answers);
  const languageStep = getLanguageStep(answers);
  const reviewStep = getReviewStep(answers, readinessLevel);
  const executionStep = getExecutionStep(answers, primaryPathway);

  return [
    {
      title: "30-day plan",
      steps: takeDistinctSteps([
        firstStep,
        focusStep,
        evidenceStep,
        needsFundingSupport(answers)
          ? fundingStep
          : "Create a short working checklist for documents, tests, and preparation tasks you can start without wasting money.",
      ]),
    },
    {
      title: "60-day plan",
      steps: takeDistinctSteps([
        reviewStep,
        fundingStep,
        languageStep,
        "Close the single readiness gap that is still making the route feel weaker than it should.",
      ]),
    },
    {
      title: "90-day plan",
      steps: takeDistinctSteps([
        executionStep,
        evidenceStep,
        languageStep,
        "Check what has changed in your readiness, timing, and supporting documents before you escalate your spend.",
      ]),
    },
    {
      title: "120-day plan",
      steps:
        answers.primaryGoal === "study_abroad"
          ? buildStudyLongRangeSteps(answers, "120-day plan")
          : buildGeneralLongRangeSteps(primaryPathway, answers, "120-day plan"),
    },
    {
      title: "180-day plan",
      steps:
        answers.primaryGoal === "study_abroad"
          ? buildStudyLongRangeSteps(answers, "180-day plan")
          : buildGeneralLongRangeSteps(primaryPathway, answers, "180-day plan"),
    },
  ];
}
