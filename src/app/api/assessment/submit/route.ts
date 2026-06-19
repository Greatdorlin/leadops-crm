import { NextResponse } from "next/server";
import { sanitizeAnswers } from "@/lib/assessment/answers";
import { assessmentSubmissionSchema } from "@/lib/pathway-engine/schemas";
import { generateReport } from "@/lib/pathway-engine/report-generator";
import { buildPublicAssessmentResult } from "@/lib/pathway-engine/report/public-report-payload";
import { syncLeadToSender } from "@/lib/sender/client";
import { leadStore } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const leadId = typeof payload.leadId === "string" ? payload.leadId : "";
    const sanitized = sanitizeAnswers(payload);
    const parsed = assessmentSubmissionSchema.safeParse(sanitized);

    if (!leadId) {
      return NextResponse.json({ error: "Lead ID is required." }, { status: 400 });
    }

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid legacy intake payload." }, { status: 400 });
    }

    if (parsed.data.primaryGoal !== "study_abroad") {
      return NextResponse.json(
        { error: "This legacy compatibility route is not available for new Leads Desk submissions." },
        { status: 400 },
      );
    }

    const report = generateReport(parsed.data);
    const publicReport = buildPublicAssessmentResult({
      answers: parsed.data,
      report,
    });

    const completedLead = await leadStore.completeLead({
      leadId,
      answers: parsed.data,
      report,
      publicReport,
    });

    const sender = await syncLeadToSender(completedLead);

    await Promise.all([
      leadStore.updateSenderSync(completedLead.id, sender),
      leadStore.upsertIntegration({
        provider: "sender",
        accountName: "Sender",
        status:
          sender.status === "success"
            ? "healthy"
            : sender.status === "failed"
              ? "failed"
              : sender.status === "not_configured"
                ? "not_configured"
                : "pending_sync",
        lastSyncAt: sender.syncedAt ?? null,
        lastError:
          sender.status === "failed" || sender.status === "not_configured"
            ? sender.message ?? null
            : null,
      }),
    ]);

    return NextResponse.json({
      leadId: completedLead.id,
      token: completedLead.reportToken,
      report: publicReport,
      sync: {
        sender,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We couldn't process this legacy submission right now.",
      },
      { status: 500 },
    );
  }
}
