import { ZodError } from "zod";
import { LeadOpportunityInputError } from "@/lib/crm/lead-opportunities";
import { AssistantError } from "@/lib/assistant/contracts";
import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageLeadRecord } from "@/lib/admin-permissions";
import { leadStore } from "@/lib/storage";
import { qualifyLeadProducts } from "@/lib/crm/qualification";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";
import { body, sameOrigin } from "@/lib/assistant/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const c = await getAdminRequestContext();
    if (!c)
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { id } = await params;
    const lead = await leadStore.getById(id);
    if (
      !lead ||
      lead.deletedAt ||
      !canManageLeadRecord(
        c.accessLevel,
        lead,
        c.session.user?.email,
        c.permissions,
        c.crmUser,
      )
    )
      return NextResponse.json(
        { error: "Lead not available." },
        { status: 404 },
      );
    const settings = await getCompanySettings();
    return NextResponse.json(
      await qualifyLeadProducts(id, await body(request), {
        createdBy: c.session.user?.email ?? "",
        globalCurrency: settings.globalCurrency,
      }),
    );
  } catch (e) {
    const message =
      e instanceof ZodError
        ? e.issues[0]?.message
        : e instanceof LeadOpportunityInputError || e instanceof AssistantError
          ? e.message
          : "Unable to save qualification. Please try again.";
    return NextResponse.json(
      { error: message },
      {
        status:
          e instanceof AssistantError
            ? e.status
            : e instanceof ZodError || e instanceof LeadOpportunityInputError
              ? 400
              : 500,
      },
    );
  }
}
