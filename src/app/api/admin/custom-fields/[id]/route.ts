import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageCustomFields } from "@/lib/crm/authz";
import {
  archiveCustomField,
  CustomFieldAdminError,
  normalizeAdminCustomFieldPayload,
  restoreCustomField,
  updateCustomField,
} from "@/lib/crm/custom-fields-admin";

const archiveActionSchema = z.object({
  action: z.enum(["archive", "restore"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageCustomFields(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const payload = await request.json().catch(() => null);

  const action = archiveActionSchema.safeParse(payload);
  try {
    if (action.success) {
      const field =
        action.data.action === "archive"
          ? await archiveCustomField(id)
          : await restoreCustomField(id);
      return NextResponse.json({ field });
    }

    const parsed = normalizeAdminCustomFieldPayload(
      typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {},
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid custom field payload." },
        { status: 400 },
      );
    }

    const field = await updateCustomField(id, parsed.data);
    return NextResponse.json({ field });
  } catch (error) {
    if (error instanceof CustomFieldAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "We couldn't update this field right now." }, { status: 500 });
  }
}
