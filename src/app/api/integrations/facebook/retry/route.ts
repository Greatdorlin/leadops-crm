import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIntegrationsAccess } from "@/lib/admin-permissions";
import { processFacebookPayload } from "@/lib/integrations/facebook/process-payload";
import { leadStore } from "@/lib/storage";

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageIntegrationsAccess(context.accessLevel, context.role, context.permissions)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { payloadId?: string };
  const failedPayloads = body.payloadId
    ? (await leadStore.listFailedPayloads("facebook_lead_ads")).filter((payload) => payload.id === body.payloadId)
    : await leadStore.listFailedPayloads("facebook_lead_ads");

  for (const payload of failedPayloads) {
    await leadStore.retrySourcePayload(payload.id);
    await processFacebookPayload(
      payload.id,
      payload.payload as Parameters<typeof processFacebookPayload>[1],
    );
  }

  return NextResponse.json({
    ok: true,
    retried: failedPayloads.length,
  });
}
