import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageLeadRecord, canViewLeadRecord } from "@/lib/admin-permissions";
import {
  LeadOpportunityInputError,
  listLeadOpportunities,
  normalizeLeadOpportunityPayload,
  replaceLeadOpportunities,
} from "@/lib/crm/lead-opportunities";
import { notifyLeadOffersQualified } from "@/lib/crm/notification-events";
import { leadStore } from "@/lib/storage";
import { getCompanySettings } from "@/lib/crm/workspace-settings-server";

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

  const opportunities = await listLeadOpportunities(id);
  return NextResponse.json({ opportunities });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = normalizeLeadOpportunityPayload(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Opportunity payload is invalid." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const lead = await leadStore.getById(id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  if (lead.deletedAt) {
    return NextResponse.json(
      { error: "Restore this lead before updating offer opportunities." },
      { status: 409 },
    );
  }

  if (
    !canManageLeadRecord(
      context.accessLevel,
      lead,
      context.session.user?.email,
      context.permissions,
      context.crmUser,
    )
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const companySettings = await getCompanySettings();
    const saved = await replaceLeadOpportunities(id, parsed.data.opportunities, {
      createCallTasksForNewlyQualified: parsed.data.createCallTasksForNewlyQualified,
      callTaskDueAt: parsed.data.callTaskDueAt,
      assignedTo: lead.assignedTo,
      createdBy: context.session.user?.email ?? null,
      globalCurrency: companySettings.globalCurrency,
    });
    const refreshedLead = await leadStore.getById(id);

    try {
      await notifyLeadOffersQualified({
        recipientUserId: refreshedLead?.assignedUserId ?? null,
        leadId: id,
        leadName: `${refreshedLead?.firstName || "Lead"} ${refreshedLead?.lastName || ""}`.trim(),
        offerLabels: saved.newlyQualifiedOfferLabels,
      });
    } catch (notificationError) {
      console.error("[lead-opportunities:notification]", notificationError);
    }

    return NextResponse.json({
      opportunities: saved.opportunities,
      rollup: saved.rollup,
      lead: refreshedLead,
      createdCallTaskCount: saved.createdCallTaskCount,
    });
  } catch (error) {
    if (error instanceof LeadOpportunityInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[lead-opportunities:update]", error);
    return NextResponse.json(
      { error: "We could not save these opportunities right now." },
      { status: 500 },
    );
  }
}
