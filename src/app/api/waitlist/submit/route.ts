import { NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeEmail, sanitizePhone, sanitizeText } from "@/lib/sanitize";
import { syncWaitlistToSender } from "@/lib/sender/waitlist";

const waitlistSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  email: z.email().max(120),
  whatsappNumber: z.string().trim().min(7).max(30),
  goalValue: z.string().trim().min(2).max(80),
  goalLabel: z.string().trim().min(2).max(120),
});

function rawString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = waitlistSchema.safeParse({
      firstName: sanitizeText(rawString(payload.firstName)),
      email: sanitizeEmail(rawString(payload.email)),
      whatsappNumber: sanitizePhone(rawString(payload.whatsappNumber)),
      goalValue: sanitizeText(rawString(payload.goalValue)),
      goalLabel: sanitizeText(rawString(payload.goalLabel)),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid waitlist payload." }, { status: 400 });
    }

    const record = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      source: "goal_waitlist" as const,
      ...parsed.data,
    };

    const senderResult = await syncWaitlistToSender(record);

    if (!senderResult.ok) {
      return NextResponse.json(
        {
          error: senderResult.error ?? "We couldn't save your waitlist request right now.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "saved",
      waitlistId: record.id,
      destination: "sender",
    });
  } catch {
    return NextResponse.json(
      { error: "We couldn't save your waitlist request right now." },
      { status: 500 },
    );
  }
}
