import { NextResponse } from "next/server";
import { sanitizeAnswers } from "@/lib/assessment/answers";
import { assessmentDraftSchema } from "@/lib/pathway-engine/schemas";
import { leadStore } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const sanitizedAnswers = sanitizeAnswers((payload.answers as Record<string, unknown>) ?? {});
    const parsed = assessmentDraftSchema.safeParse({
      ...payload,
      answers: sanitizedAnswers,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid draft payload." }, { status: 400 });
    }

    const lead = await leadStore.upsertDraft({
      leadId: parsed.data.leadId ?? null,
      answers: parsed.data.answers,
      currentStepKey: parsed.data.currentStepKey,
      currentStepIndex: parsed.data.currentStepIndex,
      progressPercent: parsed.data.progressPercent,
    });

    return NextResponse.json({
      leadId: lead.id,
      completionStatus: lead.completionStatus,
      progressPercent: lead.progressPercent,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We couldn't save your progress right now.",
      },
      { status: 500 },
    );
  }
}
