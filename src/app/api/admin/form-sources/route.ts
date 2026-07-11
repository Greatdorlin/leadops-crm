import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageFormSources } from "@/lib/crm/authz";
import {
  createFormSource,
  FormSourceAdminError,
  listFormSources,
  normalizeAdminFormSourcePayload,
} from "@/lib/crm/form-sources-admin";

export async function GET(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageFormSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const includeInactive = searchParams.get("includeInactive") === "true";
  const includeMappings = searchParams.get("includeMappings") === "true";
  const sources = await listFormSources({ includeInactive, includeMappings });
  return NextResponse.json({ sources });
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageFormSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = normalizeAdminFormSourcePayload(
    typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {},
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid form source payload." },
      { status: 400 },
    );
  }

  try {
    const source = await createFormSource(parsed.data);
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    if (error instanceof FormSourceAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "We couldn't save this source right now." }, { status: 500 });
  }
}
