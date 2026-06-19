import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/admin";
import {
  canManageTeamMember,
  resolveAdminAccessLevel,
} from "@/lib/admin-permissions";
import { canManageUsers } from "@/lib/crm/authz";
import { leadStore } from "@/lib/storage";

const crmUserActiveSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageUsers({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = crmUserActiveSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid team member payload." }, { status: 400 });
  }

  const { id } = await params;
  const targetUser = await leadStore.getCrmUserById(id);

  if (!targetUser) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  const targetAccessLevel = resolveAdminAccessLevel({
    email: targetUser.email,
    role: targetUser.role,
  });

  if (
    !canManageTeamMember(
      context.accessLevel,
      targetAccessLevel,
      context.session.user?.email,
      targetUser.email,
    )
  ) {
    return NextResponse.json({ error: "You cannot remove this team member." }, { status: 403 });
  }

  const updated = await leadStore.setCrmUserActive(id, parsed.data.isActive);

  if (!updated) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  return NextResponse.json({ user: updated });
}
