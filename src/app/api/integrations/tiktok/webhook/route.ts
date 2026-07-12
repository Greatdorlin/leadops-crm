import { after, NextResponse } from "next/server";
import { normalizeEnvValue } from "@/lib/env-utils";
import { processTikTokPayload } from "@/lib/integrations/tiktok/process-payload";
import { leadStore } from "@/lib/storage";
import { readBoundedJsonObject } from "@/lib/http/bounded-body";

function getTikTokWebhookSecret() {
  return normalizeEnvValue(process.env.TIKTOK_WEBHOOK_SECRET);
}

export async function POST(request: Request) {
  const body = await readBoundedJsonObject(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }
  const payload = body.value;

  const expectedSecret = getTikTokWebhookSecret();
  const requestUrl = new URL(request.url);
  const providedSecret =
    request.headers.get("x-leads-desk-webhook-secret") ||
    request.headers.get("x-tiktok-webhook-secret") ||
    requestUrl.searchParams.get("secret") ||
    "";

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "TikTok webhook secret is not configured." },
      { status: 503 },
    );
  }

  if (providedSecret.trim() !== expectedSecret) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payloadRecord = await leadStore.saveSourcePayload({
    source: "tiktok_lead_ads",
    externalId:
      (typeof payload.lead_id === "string" ? payload.lead_id : "") ||
      (typeof payload.id === "string" ? payload.id : "") ||
      null,
    payload,
  });

  after(async () => {
    await processTikTokPayload(
      payloadRecord.id,
      payload as Parameters<typeof processTikTokPayload>[1],
    );
  });

  return NextResponse.json({ ok: true });
}
