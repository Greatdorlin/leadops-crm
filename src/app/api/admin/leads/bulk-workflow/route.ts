import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canAssignLeads } from "@/lib/crm/authz";
import { applyBulkLeadWorkflow, bulkLeadWorkflowSchema } from "@/lib/crm/bulk-lead-workflow";

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  const actorEmail = context?.session.user?.email?.trim();
  if (!context || !actorEmail) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const parsed = bulkLeadWorkflowSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Mass change is invalid." },
      { status: 400 },
    );
  }

  try {
    const result = await applyBulkLeadWorkflow(parsed.data, {
      accessLevel: context.accessLevel,
      permissions: context.permissions,
      crmUser: context.crmUser,
      actorEmail,
      canAssign: canAssignLeads(context),
    });
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mass change could not be completed." },
      { status: 409 },
    );
  }
}
