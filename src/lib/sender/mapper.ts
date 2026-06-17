import type { LeadRecord } from "../pathway-engine/types";
import {
  buildPublicAssessmentResult,
  getPublicReportMetadata,
  getPublicReportPrimaryPathway,
} from "../pathway-engine/report/public-report-payload";
import type { SenderSubscriberPayload } from "./types";

export function mapLeadToSender(
  record: LeadRecord,
  defaultGroupId: string,
): SenderSubscriberPayload {
  const publicReport =
    record.report
      ? buildPublicAssessmentResult({
          answers: record.answers,
          report: record.report,
          publicReport: record.publicReport,
        })
      : null;
  const metadata = publicReport ? getPublicReportMetadata(publicReport) : null;

  return {
    email: record.answers.email,
    firstname: record.answers.firstName,
    lastname: record.answers.lastName,
    phone: record.answers.whatsappNumber,
    groups: defaultGroupId ? [defaultGroupId] : [],
    trigger_automation: false,
    fields: {
      pathway_goal: record.answers.primaryGoal ?? "unknown",
      lead_state: record.state ?? record.answers.stateOfResidence ?? "",
      pathway_match: publicReport ? getPublicReportPrimaryPathway(publicReport) : "No ranked pathway",
      readiness_level: metadata?.readinessLevel ?? "Not completed",
      wants_human_support: String(record.answers.wantsHumanSupport),
      report_id: metadata?.reportId ?? "",
    },
  };
}
