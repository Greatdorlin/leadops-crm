import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageLeadSources } from "@/lib/crm/authz";
import {
  createLeadSource,
  LeadSourceAdminError,
  listLeadSources,
  normalizeAdminLeadSourcePayload,
} from "@/lib/crm/lead-sources-admin";

export async function GET(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageLeadSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
  const sources = await listLeadSources({ includeArchived });
  return NextResponse.json({ sources });
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageLeadSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = normalizeAdminLeadSourcePayload(payload ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid lead source payload." },
      { status: 400 },
    );
  }

  try {
    const source = await createLeadSource(parsed.data);
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    if (error instanceof LeadSourceAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "We couldn't save this lead source right now." }, { status: 500 });
  }
}
