import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageLeadRecord } from "@/lib/admin-permissions";
import { leadStore } from "@/lib/storage";

const leadNoteSchema = z.object({
  note: z.string().trim().min(2).max(2000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  const actorEmail = context?.session.user?.email?.trim();
  if (!context || !actorEmail) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = leadNoteSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid note payload." }, { status: 400 });
  }

  const { id } = await params;
  const lead = await leadStore.getById(id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  if (lead.deletedAt) {
    return NextResponse.json(
      { error: "Restore this lead before adding notes." },
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

  const note = await leadStore.addLeadNote({
    leadId: id,
    note: parsed.data.note,
    createdBy: actorEmail,
  });

  return NextResponse.json({ note });
}
