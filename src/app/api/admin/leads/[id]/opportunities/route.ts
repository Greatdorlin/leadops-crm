import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageLeadRecord, canViewLeadRecord } from "@/lib/admin-permissions";
import {
  listLeadOpportunities,
  normalizeLeadOpportunityPayload,
  replaceLeadOpportunities,
} from "@/lib/crm/lead-opportunities";
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

  if (!canViewLeadRecord(context.accessLevel, lead, context.session.user?.email)) {
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

  if (!canManageLeadRecord(context.accessLevel, lead, context.session.user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const saved = await replaceLeadOpportunities(id, parsed.data.opportunities);
  const refreshedLead = await leadStore.getById(id);

  return NextResponse.json({
    opportunities: saved.opportunities,
    rollup: saved.rollup,
    lead: refreshedLead,
  });
}
