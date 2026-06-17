"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PublicStudyReportView } from "@/components/pathway/PublicStudyReportView";
import type {
  PublicAssessmentResult,
  PublicGeneratedReport,
} from "@/lib/pathway-engine/types";
import { useAssessmentStore } from "@/store/assessment-store";

function isStudyAssessmentResult(
  value: unknown,
): value is Extract<PublicAssessmentResult, { kind: "study" }> {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "kind" in value && value.kind === "study";
}

function isLegacyGeneratedReport(value: unknown): value is PublicGeneratedReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "topMatches" in value && "summaryDiagnosis" in value;
}

function isLegacyStudyGeneratedReport(value: unknown): value is PublicGeneratedReport {
  return isLegacyGeneratedReport(value) && !!value.studyGuidance;
}

function normalizeStoredReport(
  value: unknown,
): Extract<PublicAssessmentResult, { kind: "study" }> | null {
  if (isStudyAssessmentResult(value)) {
    return value;
  }

  return null;
}

export function ResultsClient() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { generatedReport, hasHydrated, token: storedToken } = useAssessmentStore();
  const shouldRefreshStoredStudyReport =
    storedToken === token && isLegacyStudyGeneratedReport(generatedReport);
  const [report, setReport] = useState<PublicAssessmentResult | null>(
    storedToken === token && !shouldRefreshStoredStudyReport
      ? normalizeStoredReport(generatedReport)
      : null,
  );
  const [loading, setLoading] = useState(storedToken !== token || shouldRefreshStoredStudyReport);
  const hydratedReport =
    hasHydrated && storedToken === token && !shouldRefreshStoredStudyReport
      ? normalizeStoredReport(generatedReport)
      : null;
  const visibleReport = hydratedReport ?? report;

  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      if (storedToken === token && generatedReport && !shouldRefreshStoredStudyReport) {
        return;
      }

      try {
        const response = await fetch(`/api/assessment/report/${token}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          if (!ignore) {
            setLoading(false);
            setReport(null);
          }
          return;
        }

        const payload = await response.json();
        if (!ignore) {
          setReport(payload.report);
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          setLoading(false);
          setReport(null);
        }
      }
    }

    loadReport();

    return () => {
      ignore = true;
    };
  }, [generatedReport, shouldRefreshStoredStudyReport, storedToken, token]);

  useEffect(() => {
    if (!visibleReport) {
      return;
    }

    fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        event: "report_viewed",
      }),
    }).catch(() => undefined);
  }, [visibleReport, token]);

  if (loading && !visibleReport) {
    return (
      <div className="brand-container px-4 py-10 md:px-6">
        <div className="report-panel relative overflow-hidden rounded-[36px] p-8 text-white/72">
          <div className="pointer-events-none absolute right-[-4rem] top-[-4rem] h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,190,0,0.14),transparent_72%)] blur-2xl" />
          <p className="report-kicker text-[color:var(--fc-yellow)]">Preparing your report</p>
          <h1 className="report-display mt-4 text-[2.6rem] leading-[0.92] text-white md:text-[3.4rem]">
            Loading your pathway results...
          </h1>
          <p className="mt-4 max-w-[44ch] text-base leading-8 text-white/70">
            We&apos;re pulling the latest saved report for this link now.
          </p>
        </div>
      </div>
    );
  }

  if (!visibleReport) {
    return (
      <div className="brand-container px-4 py-10 md:px-6">
        <div className="report-panel relative overflow-hidden rounded-[36px] p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,190,0,0.45),transparent)]" />
          <p className="report-kicker text-[color:var(--fc-yellow)]">
            Report unavailable
          </p>
          <h1 className="report-display mt-4 text-5xl leading-[0.95] text-white">
            We could not load this report on this device.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
            Please contact Fly Connect with your report ID.
          </p>
        </div>
      </div>
    );
  }

  return (
    visibleReport.kind === "study" ? (
      <PublicStudyReportView report={visibleReport.report} />
    ) : (
      <div className="brand-container px-4 py-8 md:px-6 md:py-10">
        <div className="report-panel relative overflow-hidden rounded-[36px] p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,190,0,0.45),transparent)]" />
          <p className="report-kicker text-[color:var(--fc-yellow)]">
            Retired report version
          </p>
          <h1 className="report-display mt-4 text-5xl leading-[0.95] text-white">
            This older report format is no longer supported.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
            Please complete a fresh study pathway assessment to view the current report experience.
          </p>
        </div>
      </div>
    )
  );
}

