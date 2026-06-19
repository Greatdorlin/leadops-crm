import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageLeadSources } from "@/lib/crm/authz";
import {
  archiveLeadSource,
  LeadSourceAdminError,
  normalizeAdminLeadSourcePayload,
  restoreLeadSource,
  updateLeadSource,
} from "@/lib/crm/lead-sources-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageLeadSources({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof payload?.action === "string" ? payload.action : null;

  try {
    if (action === "archive") {
      const source = await archiveLeadSource(id);
      return NextResponse.json({ source });
    }

    if (action === "restore") {
      const source = await restoreLeadSource(id);
      return NextResponse.json({ source });
    }

    const parsed = normalizeAdminLeadSourcePayload(payload ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid lead source payload." },
        { status: 400 },
      );
    }

    const source = await updateLeadSource(id, parsed.data);
    return NextResponse.json({ source });
  } catch (error) {
    if (error instanceof LeadSourceAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "We couldn't update this lead source right now." }, { status: 500 });
  }
}
