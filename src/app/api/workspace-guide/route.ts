import {isSameWorkspaceOrigin} from "@/lib/http/same-origin";
import { leadStore } from "@/lib/storage";
import {
  scopeLeadListFilters,
  canViewLeadRecord,
} from "@/lib/admin-permissions";
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
    const steps = workspaceGuide(role, current.permissions);
    if (current.permissions.includes("canViewLeads")) {
      try {
        const leads = await leadStore.list(
          scopeLeadListFilters(
            { limit: 1 },
            current.accessLevel,
            current.user.email,
            current.user,
          ),
        );
        const lead = leads.find(
          (l) =>
            !l.deletedAt &&
            canViewLeadRecord(
              current.accessLevel,
              l,
              current.user.email,
              current.permissions,
              current.user,
            ),
        );
        if (lead) {
          const index = steps.findIndex((s) => s.href === "/leads");
          steps.splice(index + 1, 0, {
            title: "The context behind every lead",
            description:
              "This is a real lead in your workspace. Notes keep what the person actually said beside their record, so the next teammate can pick up the conversation.",
            href: `/leads/${lead.id}`,
            label: "Open lead notes",
            target: "#lead-notes",
            action:
              "Review the saved notes. Use tasks for the next action and record payments only when received.",
          });
        }
      } catch {
        /* A workspace without an available lead can still use the tour. */
      }
    }
    return NextResponse.json(
      {
        completed: !!saved,
        userId: current.user.id,
        version: GUIDE_VERSION,
        role,
        steps,
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
  if (!isSameWorkspaceOrigin(request))
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
