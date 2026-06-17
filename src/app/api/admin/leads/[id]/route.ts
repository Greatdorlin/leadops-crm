import { NextResponse } from "next/server";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin";
import { buildLeadAssigneeList } from "@/lib/crm/lead-assignees";
import { canManageLeadRecord, canViewLeadRecord } from "@/lib/admin-permissions";
import { adminLeadUpdateSchema } from "@/lib/pathway-engine/schemas";
import { leadStore } from "@/lib/storage";

function hasOwnKey(payload: object, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

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

  if (!canViewLeadRecord(context.accessLevel, lead, context.session.user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({ lead });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = adminLeadUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lead update payload." }, { status: 400 });
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

  if (!canManageLeadRecord(context.accessLevel, existingLead, context.session.user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (
    context.accessLevel === "sales_rep" &&
    (
      (parsed.data.assignedTo &&
        normalizeAdminEmail(parsed.data.assignedTo) !==
          normalizeAdminEmail(context.session.user?.email ?? "")) ||
      (parsed.data.assignedToList &&
        parsed.data.assignedToList.some(
          (email) =>
            normalizeAdminEmail(email) !== normalizeAdminEmail(context.session.user?.email ?? ""),
        ))
    )
  ) {
    return NextResponse.json(
      { error: "Sales access cannot reassign leads to another owner." },
      { status: 403 },
    );
  }

  if (
    context.accessLevel === "sales_rep" &&
    ((hasOwnKey(parsed.data, "assignedTo") && parsed.data.assignedTo === null) ||
      (hasOwnKey(parsed.data, "assignedToList") && parsed.data.assignedToList?.length === 0))
  ) {
    return NextResponse.json(
      { error: "Sales access cannot remove lead ownership." },
      { status: 403 },
    );
  }

  const nextEmail =
    parsed.data.email === undefined ? existingLead.email : (parsed.data.email ?? "").trim();
  const nextWhatsappNumber =
    parsed.data.whatsappNumber === undefined
      ? existingLead.whatsappNumber
      : (parsed.data.whatsappNumber ?? "").trim();

  if (!nextEmail && !nextWhatsappNumber) {
    return NextResponse.json(
      { error: "Add an email or WhatsApp number before saving this lead." },
      { status: 400 },
    );
  }

  let updatedLead = existingLead;

  if (parsed.data.crmStatus !== undefined) {
    const updated = await leadStore.updateCrmStatus(
      id,
      parsed.data.crmStatus,
      context.session.user?.email ?? null,
    );

    if (!updated) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    updatedLead = updated;
  }

  if (parsed.data.priority !== undefined) {
    const updated = await leadStore.updateLeadPriority(
      id,
      parsed.data.priority,
      context.session.user?.email ?? null,
    );

    if (!updated) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    updatedLead = updated;
  }

  if (hasOwnKey(parsed.data, "assignedTo") || hasOwnKey(parsed.data, "assignedToList")) {
    const nextAssignedToList = hasOwnKey(parsed.data, "assignedToList")
      ? buildLeadAssigneeList({
          primary: parsed.data.assignedTo ?? existingLead.assignedTo,
          all: parsed.data.assignedToList ?? [],
        })
      : parsed.data.assignedTo
        ? buildLeadAssigneeList({
            primary: parsed.data.assignedTo,
            all: existingLead.assignedToList.filter((email) => email !== existingLead.assignedTo),
          })
        : [];

    const updated = await leadStore.assignLeadOwners(
      id,
      nextAssignedToList,
      context.session.user?.email ?? null,
    );

    if (!updated) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    updatedLead = updated;
  }

  if (
    parsed.data.firstName !== undefined ||
    parsed.data.lastName !== undefined ||
    parsed.data.email !== undefined ||
    parsed.data.whatsappNumber !== undefined ||
    parsed.data.state !== undefined ||
    parsed.data.primaryGoal !== undefined
  ) {
    const updated = await leadStore.updateLeadProfile(
      id,
      {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        whatsappNumber: parsed.data.whatsappNumber,
        state: parsed.data.state,
        primaryGoal: parsed.data.primaryGoal,
      },
      context.session.user?.email ?? null,
    );

    if (!updated) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    updatedLead = updated;
  }

  return NextResponse.json({ lead: updatedLead });
}
