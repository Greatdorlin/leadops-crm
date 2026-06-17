import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIntegrationsAccess } from "@/lib/admin-permissions";
import { processTikTokPayload } from "@/lib/integrations/tiktok/process-payload";
import { leadStore } from "@/lib/storage";

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageIntegrationsAccess(context.accessLevel, context.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { payloadId?: string };
  const failedPayloads = body.payloadId
    ? (await leadStore.listFailedPayloads("tiktok_lead_ads")).filter((payload) => payload.id === body.payloadId)
    : await leadStore.listFailedPayloads("tiktok_lead_ads");

  for (const payload of failedPayloads) {
    await leadStore.retrySourcePayload(payload.id);
    await processTikTokPayload(
      payload.id,
      payload.payload as Parameters<typeof processTikTokPayload>[1],
    );
  }

  return NextResponse.json({
    ok: true,
    retried: failedPayloads.length,
  });
}
