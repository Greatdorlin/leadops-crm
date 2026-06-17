import { NextResponse } from "next/server";
import { buildPublicAssessmentResult } from "@/lib/pathway-engine/report/public-report-payload";
import { leadStore } from "@/lib/storage";

const REPORT_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!REPORT_TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const record = await leadStore.getByReportToken(token);

  if (!record || !record.report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({
    report: buildPublicAssessmentResult({
      answers: record.answers,
      report: record.report,
      publicReport: record.publicReport,
    }),
    token: record.reportToken,
  });
}
