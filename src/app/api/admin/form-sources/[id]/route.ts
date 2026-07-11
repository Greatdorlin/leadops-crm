import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageFormSources } from "@/lib/crm/authz";
import {
  archiveFormSource,
  FormSourceAdminError,
  getFormSource,
  normalizeAdminFormSourcePayload,
  restoreFormSource,
  updateFormSource,
} from "@/lib/crm/form-sources-admin";

const sourceActionSchema = z.object({
  action: z.enum(["archive", "restore"]),
});

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
  const source = await getFormSource(id);
  if (!source) {
    return NextResponse.json({ error: "Form source not found." }, { status: 404 });
  }

  return NextResponse.json({ source });
}

export async function PATCH(
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
  const action = sourceActionSchema.safeParse(payload);

  try {
    if (action.success) {
      const source =
        action.data.action === "archive"
          ? await archiveFormSource(id)
          : await restoreFormSource(id);
      return NextResponse.json({ source });
    }

    const parsed = normalizeAdminFormSourcePayload(
      typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {},
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid form source payload." },
        { status: 400 },
      );
    }

    const source = await updateFormSource(id, parsed.data);
    return NextResponse.json({ source });
  } catch (error) {
    if (error instanceof FormSourceAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "We couldn't update this source right now." },
      { status: 500 },
    );
  }
}
