import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeAdminEmail } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin";
import {
  canAssignTasksToOthers,
  canManageLeadRecord,
} from "@/lib/admin-permissions";
import { leadStore } from "@/lib/storage";

const leadTaskSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  assignedTo: z.string().trim().email().nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = leadTaskSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task payload." }, { status: 400 });
  }

  const { id } = await params;
  const lead = await leadStore.getById(id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  if (lead.deletedAt) {
    return NextResponse.json(
      { error: "Restore this lead before creating tasks." },
      { status: 409 },
    );
  }

  if (
    !canManageLeadRecord(
      context.accessLevel,
      lead,
      context.session.user?.email,
      context.permissions,
    )
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (parsed.data.assignedTo) {
    const activeOwner = (await leadStore.listCrmUsers()).find(
      (user) =>
        user.isActive &&
        normalizeAdminEmail(user.email) === normalizeAdminEmail(parsed.data.assignedTo ?? ""),
    );
    if (!activeOwner) {
      return NextResponse.json(
        { error: "Choose an active workspace user as the task owner." },
        { status: 400 },
      );
    }
  }

  const assignsAnotherUser =
    parsed.data.assignedTo &&
    normalizeAdminEmail(parsed.data.assignedTo) !==
      normalizeAdminEmail(context.session.user?.email ?? "");

  if (
    assignsAnotherUser &&
    !canAssignTasksToOthers(context.accessLevel, context.permissions)
  ) {
    return NextResponse.json(
      { error: "You do not have permission to assign tasks to another user." },
      { status: 403 },
    );
  }

  const task = await leadStore.addLeadTask({
    leadId: id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    dueAt: parsed.data.dueAt ?? null,
    assignedTo: parsed.data.assignedTo ?? null,
    createdBy: context.session.user?.email ?? null,
  });

  return NextResponse.json({ task });
}
