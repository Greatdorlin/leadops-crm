import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageLeadStages } from "@/lib/crm/authz";
import {
  createLeadStage,
  LeadStageAdminError,
  listLeadStages,
  normalizeAdminLeadStagePayload,
} from "@/lib/crm/lead-stages-admin";

export async function GET(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageLeadStages({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
  const stages = await listLeadStages({ includeArchived });
  return NextResponse.json({ stages });
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageLeadStages({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = normalizeAdminLeadStagePayload(payload ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid lead stage payload." },
      { status: 400 },
    );
  }

  try {
    const stage = await createLeadStage(parsed.data);
    return NextResponse.json({ stage }, { status: 201 });
  } catch (error) {
    if (error instanceof LeadStageAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "We couldn't save this lead stage right now." }, { status: 500 });
  }
}
