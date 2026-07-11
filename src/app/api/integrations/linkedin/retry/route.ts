import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageIntegrationsAccess } from "@/lib/admin-permissions";
import { processLinkedInPayload } from "@/lib/integrations/linkedin/process-payload";
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
    ? (await leadStore.listFailedPayloads("linkedin_lead_gen_forms")).filter((payload) => payload.id === body.payloadId)
    : await leadStore.listFailedPayloads("linkedin_lead_gen_forms");

  for (const payload of failedPayloads) {
    await leadStore.retrySourcePayload(payload.id);
    await processLinkedInPayload(
      payload.id,
      payload.payload as Parameters<typeof processLinkedInPayload>[1],
    );
  }

  return NextResponse.json({
    ok: true,
    retried: failedPayloads.length,
  });
}
