import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageCustomFields } from "@/lib/crm/authz";
import {
  createCustomField,
  CustomFieldAdminError,
  listCustomFields,
  normalizeAdminCustomFieldPayload,
} from "@/lib/crm/custom-fields-admin";

export async function GET(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageCustomFields({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const includeArchived =
    new URL(request.url).searchParams.get("includeArchived") === "true";
  const fields = await listCustomFields({ includeArchived });
  return NextResponse.json({ fields });
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageCustomFields({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = normalizeAdminCustomFieldPayload(
    typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {},
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid custom field payload." },
      { status: 400 },
    );
  }

  try {
    const field = await createCustomField(parsed.data);
    return NextResponse.json({ field }, { status: 201 });
  } catch (error) {
    if (error instanceof CustomFieldAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "We couldn't save this field right now." }, { status: 500 });
  }
}
