import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageFormSources } from "@/lib/crm/authz";
import {
  FormSourceAdminError,
  listFormFieldMappings,
  normalizeAdminFormFieldMappingsPayload,
  upsertFormFieldMappings,
} from "@/lib/crm/form-sources-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageFormSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const mappings = await listFormFieldMappings(id);
  return NextResponse.json({ mappings });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageFormSources(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = normalizeAdminFormFieldMappingsPayload(
    typeof payload === "object" && payload && Array.isArray((payload as { mappings?: unknown[] }).mappings)
      ? (payload as { mappings: unknown[] }).mappings
      : [],
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid field mappings payload." },
      { status: 400 },
    );
  }

  try {
    const mappings = await upsertFormFieldMappings(id, parsed.data);
    return NextResponse.json({ mappings });
  } catch (error) {
    if (error instanceof FormSourceAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "We couldn't save these field mappings right now." },
      { status: 500 },
    );
  }
}
