import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import {
  canAccessLeadTrash,
  canManageLeadRecord,
  canSoftDeleteLead,
} from "@/lib/admin-permissions";
import { leadStore } from "@/lib/storage";

export async function POST(
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
    !canSoftDeleteLead(context.accessLevel, context.permissions) ||
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

  const updated = await leadStore.softDeleteLead(id, context.session.user?.email ?? null);
  return NextResponse.json({ lead: updated });
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canAccessLeadTrash(context.accessLevel, context.permissions)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const lead = await leadStore.getById(id);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  if (!lead.deletedAt) {
    return NextResponse.json({ error: "Lead is already active." }, { status: 400 });
  }

  const restored = await leadStore.restoreLead(id, context.session.user?.email ?? null);
  return NextResponse.json({ lead: restored });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canAccessLeadTrash(context.accessLevel, context.permissions)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const lead = await leadStore.getById(id);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  if (!lead.deletedAt) {
    return NextResponse.json(
      { error: "Move the lead to trash before deleting it permanently." },
      { status: 400 },
    );
  }

  const deleted = await leadStore.permanentlyDeleteLead(id);
  return NextResponse.json({ success: deleted });
}
