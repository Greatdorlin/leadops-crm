import { NextResponse } from "next/server";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin";
import { canCreateLeadRecords } from "@/lib/admin-permissions";
import { adminLeadCreateSchema } from "@/lib/pathway-engine/schemas";
import { leadStore } from "@/lib/storage";

function normalizeEmail(value?: string | null) {
  return value ? normalizeAdminEmail(value) : "";
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canCreateLeadRecords()) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = adminLeadCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lead payload." }, { status: 400 });
  }

  const assignedTo =
    context.accessLevel === "sales_rep"
      ? context.session.user?.email ?? null
      : parsed.data.assignedTo ?? null;

  const result = await leadStore.upsertExternalLead({
    source: parsed.data.source ?? "manual_entry",
    sourceDetail: parsed.data.sourceDetail ?? "manual_entry",
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName ?? null,
    email: parsed.data.email ?? null,
    whatsappNumber: parsed.data.whatsappNumber ?? null,
    state: parsed.data.state ?? null,
    primaryGoal: parsed.data.primaryGoal ?? null,
    crmStatus: parsed.data.crmStatus,
    priority: parsed.data.priority,
    assignedTo,
  });

  let lead = result.lead;

  if (
    assignedTo !== lead.assignedTo &&
    normalizeEmail(assignedTo) !== normalizeEmail(lead.assignedTo)
  ) {
    const updated = await leadStore.assignLead(
      lead.id,
      assignedTo,
      context.session.user?.email ?? null,
    );
    if (updated) {
      lead = updated;
    }
  }

  if (parsed.data.crmStatus !== lead.crmStatus) {
    const updated = await leadStore.updateCrmStatus(
      lead.id,
      parsed.data.crmStatus,
      context.session.user?.email ?? null,
    );
    if (updated) {
      lead = updated;
    }
  }

  if (parsed.data.priority !== lead.priority) {
    const updated = await leadStore.updateLeadPriority(
      lead.id,
      parsed.data.priority,
      context.session.user?.email ?? null,
    );
    if (updated) {
      lead = updated;
    }
  }

  return NextResponse.json({
    lead,
    created: result.created,
    duplicateOfId: result.duplicateOfId,
  });
}
