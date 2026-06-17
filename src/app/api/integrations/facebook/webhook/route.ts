import { after, NextResponse } from "next/server";
import { leadStore } from "@/lib/storage";
import { processFacebookPayload } from "@/lib/integrations/facebook/process-payload";
import {
  verifyFacebookChallenge,
  verifyFacebookWebhookSignature,
} from "@/lib/integrations/facebook/verify";

export async function GET(request: Request) {
  const challenge = verifyFacebookChallenge(new URL(request.url).searchParams);
  if (!challenge) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-hub-signature-256");

  if (!verifyFacebookWebhookSignature(rawBody, signatureHeader)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const payloadRecord = await leadStore.saveSourcePayload({
    source: "facebook_lead_ads",
    payload,
  });

  after(async () => {
    await processFacebookPayload(
      payloadRecord.id,
      payload as Parameters<typeof processFacebookPayload>[1],
    );
  });

  return NextResponse.json({ ok: true });
}
