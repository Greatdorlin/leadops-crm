import { after, NextResponse } from "next/server";
import { getGoogleAdsWebhookKey } from "@/lib/integrations/google-ads/client";
import { processGoogleAdsPayload } from "@/lib/integrations/google-ads/process-payload";
import { leadStore } from "@/lib/storage";
import { readBoundedJsonObject } from "@/lib/http/bounded-body";

export async function POST(request: Request) {
  const body = await readBoundedJsonObject(request);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }
  const payload = body.value;

  const expectedKey = getGoogleAdsWebhookKey();
  const providedKey =
    (typeof payload.google_key === "string" ? payload.google_key : "") ||
    new URL(request.url).searchParams.get("key") ||
    request.headers.get("x-google-ads-webhook-key") ||
    "";

  if (!expectedKey) {
    return NextResponse.json(
      { error: "Google Ads webhook key is not configured." },
      { status: 503 },
    );
  }

  if (providedKey.trim() !== expectedKey) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payloadRecord = await leadStore.saveSourcePayload({
    source: "google_ads",
    externalId: typeof payload.lead_id === "string" ? payload.lead_id : null,
    payload,
  });

  after(async () => {
    await processGoogleAdsPayload(
      payloadRecord.id,
      payload as Parameters<typeof processGoogleAdsPayload>[1],
    );
  });

  return NextResponse.json({ ok: true });
}
