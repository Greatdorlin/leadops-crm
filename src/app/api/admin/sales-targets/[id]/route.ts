import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageSalesTargets } from "@/lib/crm/authz";
import {
  archiveSalesTarget,
  normalizeAdminSalesTargetPayload,
  restoreSalesTarget,
  SalesTargetAdminError,
  updateSalesTarget,
} from "@/lib/crm/sales-targets-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageSalesTargets({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof payload?.action === "string" ? payload.action : null;

  try {
    if (action === "archive") {
      const target = await archiveSalesTarget(id);
      return NextResponse.json({ target });
    }

    if (action === "restore") {
      const target = await restoreSalesTarget(id);
      return NextResponse.json({ target });
    }

    const parsed = normalizeAdminSalesTargetPayload(payload ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid sales target payload." },
        { status: 400 },
      );
    }

    const target = await updateSalesTarget(id, parsed.data);
    return NextResponse.json({ target });
  } catch (error) {
    if (error instanceof SalesTargetAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "We couldn't update this sales target right now." }, { status: 500 });
  }
}
