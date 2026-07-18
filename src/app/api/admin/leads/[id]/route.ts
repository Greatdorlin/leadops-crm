import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageLeadRecord, canViewLeadRecord } from "@/lib/admin-permissions";
import { listCustomFields } from "@/lib/crm/custom-fields-admin";
import { validateCustomFieldValues } from "@/lib/crm/custom-field-values";
import { normalizeAdminLeadProfilePayload } from "@/lib/crm/form-contracts";
import {
  LeadBusinessFieldUpdateError,
  updateLeadBusinessFields,
} from "@/lib/crm/lead-business-fields";
import { leadStore } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const lead = await leadStore.getById(id);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  if (
    !canViewLeadRecord(
      context.accessLevel,
      lead,
      context.session.user?.email,
      context.permissions,
      context.crmUser,
    )
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ lead });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  const actorEmail = context?.session.user?.email?.trim();
  if (!context || !actorEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const normalizedProfile = payload ? normalizeAdminLeadProfilePayload(payload) : null;
  if (!normalizedProfile?.success) {
    return NextResponse.json(
      { error: normalizedProfile?.error.issues[0]?.message ?? "Invalid lead update payload." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const existingLead = await leadStore.getById(id);
  if (!existingLead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  if (existingLead.deletedAt) {
    return NextResponse.json(
      { error: "Restore this lead before updating it." },
      { status: 409 },
    );
  }
  if (
    !canManageLeadRecord(
      context.accessLevel,
      existingLead,
      actorEmail,
      context.permissions,
      context.crmUser,
    )
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const customFieldDefinitions = (await listCustomFields()).filter(
    (field) => field.showInForm && !field.archived,
  );
  const customFieldValidation = validateCustomFieldValues(
    customFieldDefinitions,
    normalizedProfile.data.customFieldValues,
  );
  if (!customFieldValidation.success) {
    return NextResponse.json(
      {
        error:
          Object.values(customFieldValidation.fieldErrors)[0] ??
          "Custom field values are invalid.",
      },
      { status: 400 },
    );
  }

  try {
    const updated = await updateLeadBusinessFields({
      leadId: id,
      actorEmail,
      profile: normalizedProfile.data,
      customFieldValues: customFieldValidation.values,
      customFieldDefinitions,
    });
    if (!updated) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    return NextResponse.json({ lead: updated });
  } catch (error) {
    if (error instanceof LeadBusinessFieldUpdateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
