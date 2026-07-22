import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageAdminSettings } from "@/lib/crm/authz";
import {
  createWorkspaceAutomation,
  listWorkspaceAutomations,
  workspaceAutomationPayloadSchema,
} from "@/lib/crm/workspace-automations";

export async function GET() {
  const context = await getAdminRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageAdminSettings(context)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  return NextResponse.json({ rules: await listWorkspaceAutomations() });
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  const actorEmail = context?.session.user?.email;
  if (!context || !actorEmail) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageAdminSettings(context)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const parsed = workspaceAutomationPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid automation." }, { status: 400 });
  const rule = await createWorkspaceAutomation(parsed.data, actorEmail);
  return NextResponse.json({ rule }, { status: 201 });
}
