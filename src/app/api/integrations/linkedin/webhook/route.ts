import { after, NextResponse } from "next/server";
import { processLinkedInPayload } from "@/lib/integrations/linkedin/process-payload";
import {
  buildLinkedInChallengeResponse,
  verifyLinkedInSignature,
} from "@/lib/integrations/linkedin/verify";
import { leadStore } from "@/lib/storage";
import { readBoundedBody } from "@/lib/http/bounded-body";

export async function GET(request: Request) {
  const challengeCode = new URL(request.url).searchParams.get("challengeCode")?.trim() ?? "";
  if (!challengeCode) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json(buildLinkedInChallengeResponse(challengeCode));
}

export async function POST(request: Request) {
  const body = await readBoundedBody(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }
  const rawBody = body.text;
  const signature = request.headers.get("x-li-signature");

  if (!verifyLinkedInSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
  const payloadRecord = await leadStore.saveSourcePayload({
    source: "linkedin_lead_gen_forms",
    externalId:
      (typeof payload.id === "string" ? payload.id : "") ||
      (typeof payload.leadGenFormResponse === "string" ? payload.leadGenFormResponse : "") ||
      null,
    payload,
  });

  after(async () => {
    await processLinkedInPayload(
      payloadRecord.id,
      payload as Parameters<typeof processLinkedInPayload>[1],
    );
  });

  return NextResponse.json({ ok: true });
}
