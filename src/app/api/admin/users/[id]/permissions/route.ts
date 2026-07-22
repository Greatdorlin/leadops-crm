import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageTeamMember, resolveAdminAccessLevel } from "@/lib/admin-permissions";
import { canManageUsers } from "@/lib/crm/authz";
import { isPermissionKey } from "@/lib/crm/role-permissions-contract";
import {
  clearUserPermissionOverride,
  listUserPermissionOverrides,
  setUserPermissionOverride,
} from "@/lib/crm/role-permissions";
import { leadStore } from "@/lib/storage";

const updatePermissionSchema = z.object({
  permission: z.string().refine(isPermissionKey, "Unknown permission."),
  enabled: z.boolean().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageUsers(context)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const parsed = updatePermissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid permission state." }, { status: 400 });
  }

  const { id } = await params;
  const targetUser = await leadStore.getCrmUserById(id);
  if (!targetUser) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  const currentEmail = context.session.user?.email?.trim().toLowerCase();
  if (currentEmail === targetUser.email.trim().toLowerCase()) {
    return NextResponse.json({ error: "You cannot change your own permissions." }, { status: 403 });
  }
  if (targetUser.role === "admin" && parsed.data.permission !== "canResetWorkspace") {
    return NextResponse.json({ error: "Owner permissions cannot be changed." }, { status: 403 });
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
      context.permissions,
    )
  ) {
    return NextResponse.json({ error: "You cannot manage this team member." }, { status: 403 });
  }

  try {
    if (parsed.data.enabled === null) {
      await clearUserPermissionOverride(id, parsed.data.permission);
    } else {
      await setUserPermissionOverride(id, parsed.data.permission, parsed.data.enabled);
    }

    return NextResponse.json({
      overrides: await listUserPermissionOverrides([id]),
    });
  } catch (error) {
    console.error("[api:user-permissions] PATCH error:", error);
    return NextResponse.json({ error: "Permission could not be updated." }, { status: 500 });
  }
}
