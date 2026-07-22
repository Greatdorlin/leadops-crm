import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/admin";
import { canResetWorkspaceSettings } from "@/lib/crm/authz";
import { resetWorkspaceExperience } from "@/lib/crm/workspace-reset";

const resetSchema = z.object({
  confirmation: z.literal("RESET WORKSPACE SETTINGS"),
});

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context?.crmUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canResetWorkspaceSettings(context)) {
    return NextResponse.json({ error: "Only the owner or an explicitly permitted admin can reset workspace settings." }, { status: 403 });
  }

  const parsed = resetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Type the exact confirmation phrase." }, { status: 400 });
  }

  await resetWorkspaceExperience({
    actorEmail: context.crmUser.email,
    actorUserId: context.crmUser.id,
  });
  return NextResponse.json({ ok: true });
}
