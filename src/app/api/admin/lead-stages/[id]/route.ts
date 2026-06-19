import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageLeadStages } from "@/lib/crm/authz";
import {
  archiveLeadStage,
  LeadStageAdminError,
  normalizeAdminLeadStagePayload,
  restoreLeadStage,
  updateLeadStage,
} from "@/lib/crm/lead-stages-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageLeadStages({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof payload?.action === "string" ? payload.action : null;

  try {
    if (action === "archive") {
      const stage = await archiveLeadStage(id);
      return NextResponse.json({ stage });
    }

    if (action === "restore") {
      const stage = await restoreLeadStage(id);
      return NextResponse.json({ stage });
    }

    const parsed = normalizeAdminLeadStagePayload(payload ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid lead stage payload." },
        { status: 400 },
      );
    }

    const stage = await updateLeadStage(id, parsed.data);
    return NextResponse.json({ stage });
  } catch (error) {
    if (error instanceof LeadStageAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "We couldn't update this lead stage right now." }, { status: 500 });
  }
}
