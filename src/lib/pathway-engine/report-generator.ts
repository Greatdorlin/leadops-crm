import { getActionPlans, getCurrentActionPlanTitle } from "./action-plans";
import { getBlockers } from "./blockers";
import { getRecommendedOffer } from "./offers";
import { PATHWAYS } from "./pathways";
import {
  getFirstPracticalStep,
  getReadinessLevel,
  getReadinessSummary,
  humanizeStudyGuidance,
  getStudySummaryDiagnosis,
  getSummaryDiagnosis,
  getWhyThesePathwaysFit,
  REPORT_DISCLAIMER,
} from "./report-copy";
import { getStudyGuidance } from "./study-knowledge";
import { REPORT_VERSION } from "./report-knowledge";
import { scorePathways } from "./scoring";
import { getLeadSegment } from "./segments";
import type {
  ActionPlanWindow,
  AssessmentAnswers,
  GeneratedReport,
  PathwayContrast,
  PathwayMatch,
  PublicGeneratedReport,
  PublicStudyGuidance,
  ReportBlocker,
  RouteRecommendation,
  StudyDocumentChecklistItem,
  StudyFitHighlight,
  StudyTimelineStep,
} from "./types";

function toPathwayMatch(
  answers: AssessmentAnswers,
  match: ReturnType<typeof scorePathways>[number],
): PathwayMatch {
  const definition = PATHWAYS[match.id];
  const destination =
    answers.destinationInterest && answers.destinationInterest !== "not_sure"
      ? ` with ${answers.destinationInterest.replaceAll("_", " ")} in view`
      : "";

  return {
    id: match.id,
    title: definition.title,
    score: match.score,
    scoreLabel: match.label,
    summary: `${definition.shortDescription}${destination}.`,
    reason: definition.fitReason,
  };
}

function buildWhatsappSummary(
  primaryMatch: PathwayMatch,
  readinessLevel: string,
  blockers: string,
  offerTitle: string,
  reportId: string,
  studyPathway?: string,
) {
  return [
    "Hello Fly Connect, I just completed my Pathway Finder report.",
    "",
    "My result summary:",
    `- Primary pathway: ${studyPathway ?? primaryMatch.title}`,
    `- Readiness level: ${readinessLevel}`,
    `- Main blockers: ${blockers}`,
    `- Recommended next step: ${offerTitle}`,
    "",
    `Report ID: ${reportId}`,
    "",
    "I would like to speak with the consultation team about my next path forward.",
  ].join("\n");
}

function buildPathwayContrasts(
  matches: PathwayMatch[],
  existingContrasts?: PathwayContrast[],
): PathwayContrast[] {
  if (existingContrasts && existingContrasts.length > 0) {
    return existingContrasts.slice(0, 3);
  }

  return matches.slice(0, 3).map((match) => {
    const definition = PATHWAYS[match.id];

    return {
      id: match.id,
      title: definition?.title ?? match.title,
      score: match.score,
      scoreLabel: match.scoreLabel,
      fitReason: definition?.fitReason ?? match.reason,
    };
  });
}

function buildProblems(
  blockers: ReportBlocker[],
  existingProblems?: { title: string; description: string }[],
) {
  if (existingProblems && existingProblems.length > 0) {
    return existingProblems.map((problem) => ({
      title: problem.title,
      description: problem.description,
    }));
  }

  return blockers.map((blocker) => ({
    title: blocker.title,
    description: blocker.description,
  }));
}

function buildRecommendedOfferReason(leadSegment: GeneratedReport["leadSegment"]) {
  return leadSegment === "Consultation priority"
    ? "Your answers show enough urgency or complexity that a guided review should happen before you make the next commitment."
    : "This is the clearest next move based on your readiness, blockers, and strongest route direction.";
}

function deriveLegacyCurrentActionPlanTitle(report: GeneratedReport): GeneratedReport["currentActionPlanTitle"] {
  if (report.currentActionPlanTitle) {
    return report.currentActionPlanTitle;
  }

  switch (report.readinessLevel) {
    case "Foundation":
      return "30-day plan";
    case "Emerging":
      return "60-day plan";
    case "Advancing":
      return "90-day plan";
    case "Action-ready":
    default:
      return "120-day plan";
  }
}

function buildLegacyActionPlans(report: GeneratedReport): ActionPlanWindow[] {
  const existing = report.actionPlans ?? [];

  if (existing.length >= 5) {
    return existing;
  }

  const routeTitle = report.topMatches[0]?.title ?? "your strongest route";
  const blockers = report.blockers.map((item) => item.title.toLowerCase());
  const blockerReference =
    blockers[0] ?? "your remaining readiness checks";

  const fallbackPlans: ActionPlanWindow[] = [
    {
      title: "120-day plan",
      steps: [
        `Finalize the funding, document, and shortlist decisions that support ${routeTitle.toLowerCase()}.`,
        "Gather the supporting evidence you will need before formal applications begin.",
        `Begin visa and compliance preparation once ${blockerReference} is no longer slowing the route down.`,
      ],
    },
    {
      title: "180-day plan",
      steps: [
        `Submit the strongest ${routeTitle.toLowerCase()} applications once the route is fully documented.`,
        "Complete any scholarship, sponsor, or support applications that strengthen the plan.",
        "Prepare your visa paperwork, travel logistics, and arrival planning early enough to avoid rushed decisions.",
      ],
    },
  ];

  return [
    ...existing,
    ...fallbackPlans,
  ].slice(0, 5);
}

export function generateReport(answers: AssessmentAnswers): GeneratedReport {
  const scores = scorePathways(answers);
  const matches = scores.slice(0, 3).map((score) => toPathwayMatch(answers, score));
  const primaryMatch =
    matches[0] ??
    (() => {
      const fallback = PATHWAYS.exploration_not_sure;
      return {
        id: fallback.id,
        title: fallback.title,
        score: 0,
        scoreLabel: "Early-stage fit" as const,
        summary: `${fallback.shortDescription}.`,
        reason: fallback.fitReason,
      };
    })();
  const blockers = getBlockers(answers);
  const readinessLevel = getReadinessLevel(answers, blockers, primaryMatch.score);
  const readinessSummary = getReadinessSummary(readinessLevel, blockers);
  const leadSegment = getLeadSegment(answers, scores.slice(0, 3));
  const studyGuidanceRecord = answers.primaryGoal === "study_abroad" ? getStudyGuidance(answers) : null;
  const studyGuidance = studyGuidanceRecord
    ? humanizeStudyGuidance(answers, studyGuidanceRecord.public)
    : null;
  const recommendedOffer = getRecommendedOffer(
    answers,
    leadSegment,
    primaryMatch.id,
  );
  const firstPracticalStep =
    studyGuidance?.firstPracticalStep ?? getFirstPracticalStep(blockers, primaryMatch);
  const reportId = `FC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const summaryDiagnosis = studyGuidance
    ? getStudySummaryDiagnosis(answers, studyGuidance)
    : getSummaryDiagnosis(answers, primaryMatch, blockers);
  const pathwayContrasts = buildPathwayContrasts(matches);
  const problems = buildProblems(blockers);
  const currentActionPlanTitle = getCurrentActionPlanTitle(answers, readinessLevel);

  return {
    reportId,
    createdAt: new Date().toISOString(),
    reportVersion: REPORT_VERSION,
    firstName: answers.firstName,
    summaryDiagnosis,
    readinessLevel,
    readinessSummary,
    topMatches: matches,
    pathwayContrasts,
    blockers,
    problems,
    firstPracticalStep,
    whyThesePathwaysFit: getWhyThesePathwaysFit(matches, leadSegment),
    currentActionPlanTitle,
    actionPlans: getActionPlans({
      answers,
      primaryPathway: primaryMatch.id,
      blockers,
      readinessLevel,
      studyGuidance,
    }),
    recommendedOffer,
    recommendedOfferReason: buildRecommendedOfferReason(leadSegment),
    disclaimer: REPORT_DISCLAIMER,
    whatsappSummary: buildWhatsappSummary(
      primaryMatch,
      readinessLevel,
      blockers.map((item) => item.title).join(", ") || "No major blockers highlighted",
      recommendedOffer.title,
      reportId,
      studyGuidance?.publicPathwayName,
    ),
    leadSegment,
    studyGuidance,
    internalStudyGuidance: studyGuidanceRecord?.internal ?? null,
  };
}

export function normalizeGeneratedReport(
  report: GeneratedReport,
  answers?: AssessmentAnswers,
): GeneratedReport {
  const primaryMatch =
    report.topMatches[0] ??
    (() => {
      const fallback = PATHWAYS.exploration_not_sure;
      return {
        id: fallback.id,
        title: fallback.title,
        score: 0,
        scoreLabel: "Early-stage fit" as const,
        summary: `${fallback.shortDescription}.`,
        reason: fallback.fitReason,
      };
    })();

  const refreshedStudyGuidance = answers?.primaryGoal === "study_abroad" ? getStudyGuidance(answers) : null;
  const studyGuidance = answers
    ? refreshedStudyGuidance
      ? humanizeStudyGuidance(answers, refreshedStudyGuidance.public)
      : report.studyGuidance
    : report.studyGuidance;
  const internalStudyGuidance = refreshedStudyGuidance?.internal ?? report.internalStudyGuidance;
  const pathwayContrasts = buildPathwayContrasts(report.topMatches, report.pathwayContrasts);
  const problems = buildProblems(report.blockers, report.problems);
  const currentActionPlanTitle = answers
    ? getCurrentActionPlanTitle(answers, report.readinessLevel)
    : deriveLegacyCurrentActionPlanTitle(report);
  const actionPlans = answers
    ? getActionPlans({
        answers,
        primaryPathway: primaryMatch.id,
        blockers: report.blockers,
        readinessLevel: report.readinessLevel,
        studyGuidance,
      })
    : buildLegacyActionPlans(report);

  return {
    ...report,
    reportVersion: report.reportVersion ?? REPORT_VERSION,
    summaryDiagnosis: answers
      ? studyGuidance
        ? getStudySummaryDiagnosis(answers, studyGuidance)
        : getSummaryDiagnosis(answers, primaryMatch, report.blockers)
      : report.summaryDiagnosis,
    readinessSummary: answers
      ? getReadinessSummary(report.readinessLevel, report.blockers)
      : report.readinessSummary,
    pathwayContrasts,
    problems,
    firstPracticalStep: studyGuidance?.firstPracticalStep ?? report.firstPracticalStep,
    whyThesePathwaysFit: answers
      ? getWhyThesePathwaysFit(report.topMatches, report.leadSegment)
      : report.whyThesePathwaysFit,
    currentActionPlanTitle,
    actionPlans,
    recommendedOffer: answers
      ? getRecommendedOffer(answers, report.leadSegment, primaryMatch.id)
      : report.recommendedOffer,
    recommendedOfferReason: buildRecommendedOfferReason(report.leadSegment),
    studyGuidance,
    internalStudyGuidance,
  };
}

const publicFinancePattern =
  /(?:£|€|\$|gbp|eur|usd|\b\d{1,3}(?:,\d{3})+\b|\b\d+(?:\.\d+)?\s*(?:k|thousand|million)\b)/i;

function publicSafeText(value: string) {
  return value
    .replace(/Schiller International University/gi, "the flexible France route")
    .replace(/University of Manchester Global Futures Scholarship/gi, "the merit-based UK route")
    .replace(/UK Study Now Pay Later \/ UK Tuition Deposit Loan/gi, "the UK loan-supported route")
    .replace(/Canada Study Now Pay Later Diploma Programme/gi, "the Canada loan-supported route")
    .replace(/postgraduate/gi, "Masters or PhD")
    .replace(/postgrad/gi, "Masters or PhD")
    .replace(/Scholarship\/Funded Study/gi, "Supported Study Route")
    .replace(/Low-Budget Preparation/gi, "Preparation-First Planning")
    .replace(/budget protection/gi, "readiness protection")
    .replace(/budget sensitivity/gi, "readiness timing")
    .replace(/financial structure/gi, "readiness structure")
    .replace(/financial details/gi, "private planning details")
    .replace(/scholarship evidence/gi, "supporting evidence")
    .replace(/route supports/gi, "route support")
    .replace(/cost-aware/gi, "sequence-aware")
    .replace(/spend heavily/gi, "move too quickly")
    .replace(/spend money/gi, "commit too early")
    .replace(/overspending/gi, "moving too early")
    .replace(/payments or applications/gi, "applications")
    .replace(/paying for/gi, "starting")
    .replace(/\bpaying\b/gi, "starting")
    .replace(/\bcash\b/gi, "effort")
    .replace(/financial or travel decisions/gi, "major travel decisions")
    .replace(/sponsor documents/gi, "supporting documents")
    .replace(/\bsponsors\b/gi, "support sources");
}

function isPublicFinanceItem(value: string) {
  return publicFinancePattern.test(value);
}

function sanitizeFitHighlight(item: StudyFitHighlight): StudyFitHighlight {
  return {
    title: publicSafeText(item.title),
    description: publicSafeText(item.description),
  };
}

function sanitizeTimelineStep(item: StudyTimelineStep): StudyTimelineStep {
  return {
    window: item.window,
    title: publicSafeText(item.title),
    description: publicSafeText(item.description),
  };
}

function sanitizeChecklistItem(item: StudyDocumentChecklistItem): StudyDocumentChecklistItem {
  return {
    title: publicSafeText(item.title),
    status: item.status,
    note: publicSafeText(item.note),
  };
}

function sanitizeRouteRecommendation(item: RouteRecommendation): RouteRecommendation {
  return {
    role: item.role,
    publicRouteName: publicSafeText(item.publicRouteName),
    publicLocation: publicSafeText(item.publicLocation),
    publicReason: publicSafeText(item.publicReason),
    keyCondition: publicSafeText(item.keyCondition),
    nextStep: publicSafeText(item.nextStep),
  };
}

function sanitizePublicStudyGuidance(guidance: PublicStudyGuidance): PublicStudyGuidance {
  return {
    ...guidance,
    publicPathwayName: publicSafeText(guidance.publicPathwayName),
    publicLocation: publicSafeText(guidance.publicLocation),
    routeSummary: publicSafeText(guidance.routeSummary),
    fitSummary: publicSafeText(guidance.fitSummary),
    whyThisFits: guidance.whyThisFits.map(publicSafeText).filter((item) => !isPublicFinanceItem(item)),
    publicRecommendation: publicSafeText(guidance.publicRecommendation),
    biggestBlocker: guidance.biggestBlocker ? publicSafeText(guidance.biggestBlocker) : null,
    blockers: guidance.blockers.map(publicSafeText).filter((item) => !isPublicFinanceItem(item)),
    keyRequirements: guidance.keyRequirements
      .filter((item) => !isPublicFinanceItem(`${item.group} ${item.item} ${item.publicDescription}`))
      .map((item) => ({
        ...item,
        group: publicSafeText(item.group),
        item: publicSafeText(item.item),
        publicDescription: publicSafeText(item.publicDescription),
        ifMissingRecommendation: publicSafeText(item.ifMissingRecommendation),
      })),
    questionsToAsk: guidance.questionsToAsk
      .map(publicSafeText)
      .filter((item) => !isPublicFinanceItem(item)),
    firstPracticalStep: publicSafeText(guidance.firstPracticalStep),
    fitHighlights: guidance.fitHighlights
      .map(sanitizeFitHighlight)
      .filter((item) => !isPublicFinanceItem(`${item.title} ${item.description}`)),
    routeRecommendations: guidance.routeRecommendations.map(sanitizeRouteRecommendation),
    documentChecklist: guidance.documentChecklist
      .filter((item) => !isPublicFinanceItem(`${item.title} ${item.note}`))
      .map(sanitizeChecklistItem),
    financialReadinessSignals: guidance.financialReadinessSignals.map(publicSafeText),
    milestoneTimeline: guidance.milestoneTimeline.map(sanitizeTimelineStep),
    consultationAgenda: guidance.consultationAgenda
      .map(publicSafeText)
      .filter((item) => !isPublicFinanceItem(item)),
    publicReadinessSignals: guidance.publicReadinessSignals.map(publicSafeText),
  };
}

export function toPublicGeneratedReport(
  report: GeneratedReport,
  answers?: AssessmentAnswers,
): PublicGeneratedReport {
  const normalizedReport = normalizeGeneratedReport(report, answers);
  const { internalStudyGuidance, ...publicReport } = normalizedReport;
  void internalStudyGuidance;
  const pathwayContrasts = buildPathwayContrasts(
    publicReport.topMatches,
    publicReport.pathwayContrasts,
  );
  const problems = buildProblems(publicReport.blockers, publicReport.problems);

  return {
    ...publicReport,
    summaryDiagnosis: publicSafeText(publicReport.summaryDiagnosis),
    readinessSummary: publicSafeText(publicReport.readinessSummary),
    topMatches: publicReport.topMatches.map((match) => ({
      ...match,
      title: publicSafeText(match.title),
      summary: publicSafeText(match.summary),
      reason: publicSafeText(match.reason),
    })),
    pathwayContrasts: pathwayContrasts.map((contrast) => ({
      ...contrast,
      title: publicSafeText(contrast.title),
      fitReason: publicSafeText(contrast.fitReason),
    })),
    blockers: publicReport.blockers.map((blocker) => ({
      ...blocker,
      title: publicSafeText(blocker.title),
      description: publicSafeText(blocker.description),
    })),
    problems: problems.map((problem) => ({
      title: publicSafeText(problem.title),
      description: publicSafeText(problem.description),
    })),
    firstPracticalStep: publicSafeText(publicReport.firstPracticalStep),
    whyThesePathwaysFit: publicReport.whyThesePathwaysFit.map(publicSafeText),
    actionPlans: publicReport.actionPlans.map((plan) => ({
      ...plan,
      steps: plan.steps.map(publicSafeText),
    })),
    disclaimer: publicSafeText(publicReport.disclaimer),
    whatsappSummary: publicSafeText(publicReport.whatsappSummary),
    studyGuidance: publicReport.studyGuidance
      ? sanitizePublicStudyGuidance(publicReport.studyGuidance)
      : null,
  };
}
