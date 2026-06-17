import type {
  AssessmentAnswers,
  GeneratedReport,
  PublicAssessmentResult,
} from "../types";
import { toPublicGeneratedReport } from "../report-generator";
import { buildPublicStudyReportPayload } from "./build-public-study-report";

function buildStoredPublicAssessmentResult(args: {
  answers: AssessmentAnswers;
  report: GeneratedReport;
}): PublicAssessmentResult {
  if (args.answers.primaryGoal === "study_abroad") {
    const payload = buildPublicStudyReportPayload({
      answers: args.answers,
      guidance: args.report.studyGuidance,
      generatedReport: args.report,
    });

    return {
      kind: "study",
      report: payload.publicReport,
    };
  }

  return {
    kind: "general",
    report: toPublicGeneratedReport(args.report, args.answers),
  };
}

export function buildPublicAssessmentResult(args: {
  answers: AssessmentAnswers;
  report: GeneratedReport;
  publicReport?: PublicAssessmentResult | null;
}): PublicAssessmentResult {
  if (args.publicReport) {
    return args.publicReport;
  }

  return buildStoredPublicAssessmentResult(args);
}

export function getPublicReportPrimaryPathway(report: PublicAssessmentResult): string {
  return report.kind === "study"
    ? report.report.primaryRoute.title
    : report.report.studyGuidance?.publicPathwayName ?? report.report.topMatches[0]?.title ?? "No ranked pathway";
}

export function getPublicReportMetadata(report: PublicAssessmentResult) {
  if (report.kind === "study") {
    return report.report.metadata;
  }

  return {
    reportId: report.report.reportId,
    createdAt: report.report.createdAt,
    reportVersion: report.report.reportVersion,
    readinessLevel: report.report.readinessLevel,
    readinessSummary: report.report.readinessSummary,
  };
}
