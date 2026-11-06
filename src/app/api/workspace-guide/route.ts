import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAdminRequestContext } from "@/lib/admin";
import { activeCrmActor } from "@/lib/crm/active-actor";
import { getDb } from "@/lib/db/client";
import { userGuides } from "@/lib/db/schema";
import { resolveLeadsDeskRole } from "@/lib/crm/roles";
import { GUIDE_VERSION, workspaceGuide } from "@/lib/crm/workspace-guide";
export const dynamic = "force-dynamic";
async function actor() {
  const context = await getAdminRequestContext();
  if (!context?.crmUser?.id || context.requestedAccessLevel) return null;
  return activeCrmActor(context.crmUser.id);
}
export async function GET() {
  try {
    const current = await actor();
    if (!current)
      return NextResponse.json(
        { error: "Sign in as yourself." },
        { status: 401 },
      );
    const role = resolveLeadsDeskRole({
      accessLevel: current.accessLevel,
      role: current.user.role,
    });
    if (!role)
      return NextResponse.json(
        { error: "Your workspace role is not available." },
        { status: 403 },
      );
    const [saved] = await getDb()
      .select()
      .from(userGuides)
      .where(
        and(
          eq(userGuides.userId, current.user.id),
          eq(userGuides.role, role),
          eq(userGuides.version, GUIDE_VERSION),
        ),
      );
    return NextResponse.json(
      {
        completed: !!saved,
        role,
        steps: workspaceGuide(role, current.permissions),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "The guide could not be loaded." },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Open the guide from your workspace." },
      { status: 403 },
    );
  try {
    const current = await actor();
    if (!current)
      return NextResponse.json(
        { error: "Sign in as yourself." },
        { status: 401 },
      );
    const role = resolveLeadsDeskRole({
      accessLevel: current.accessLevel,
      role: current.user.role,
    });
    if (!role)
      return NextResponse.json(
        { error: "Your workspace role is not available." },
        { status: 403 },
      );
    await getDb()
      .insert(userGuides)
      .values({ userId: current.user.id, role, version: GUIDE_VERSION })
      .onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Your progress could not be saved. Please try again." },
      { status: 503 },
    );
  }
}
