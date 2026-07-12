import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/admin";
import {
  ADMIN_ACCESS_LEVELS,
  canManageTeamMember,
  getGrantableAccessLevels,
  getStoredRoleForAccessLevel,
  type AdminAccessLevel,
  resolveAdminAccessLevel,
} from "@/lib/admin-permissions";
import { canManageUsers } from "@/lib/crm/authz";
import { leadStore } from "@/lib/storage";

const avatarImageSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) {
      return true;
    }

    if (/^https?:\/\//i.test(value)) {
      return true;
    }

    return /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value) && value.length <= 2_900_000;
  }, "Profile photo must be a valid image under 2MB.");

const crmUserUpdateSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").optional(),
  avatarUrl: avatarImageSchema.nullable().optional(),
  accessLevel: z.enum(ADMIN_ACCESS_LEVELS).optional(),
  isActive: z.boolean().optional(),
  accessScope: z.enum(["all", "branch", "department", "team", "own"]).optional(),
  branchId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
}).superRefine((value, context) => {
  if (value.accessScope === "branch" && !value.branchId) {
    context.addIssue({ code: "custom", message: "Choose a branch.", path: ["branchId"] });
  }
  if (value.accessScope === "department" && !value.departmentId) {
    context.addIssue({ code: "custom", message: "Choose a department.", path: ["departmentId"] });
  }
  if (value.accessScope === "team" && !value.teamId) {
    context.addIssue({ code: "custom", message: "Choose a team.", path: ["teamId"] });
  }
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = crmUserUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid team member payload." }, { status: 400 });
  }

  const { id } = await params;
  const targetUser = await leadStore.getCrmUserById(id);

  if (!targetUser) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  const currentUserEmail = context.session.user?.email?.trim().toLowerCase() ?? "";
  const targetEmail = targetUser.email.trim().toLowerCase();
  const isSelfUpdate = Boolean(currentUserEmail && currentUserEmail === targetEmail);
  const targetAccessLevel = resolveAdminAccessLevel({
    email: targetUser.email,
    role: targetUser.role,
  });
  const wantsRosterChange =
    typeof parsed.data.isActive === "boolean" ||
    typeof parsed.data.accessLevel === "string" ||
    typeof parsed.data.accessScope === "string" ||
    parsed.data.branchId !== undefined ||
    parsed.data.departmentId !== undefined ||
    parsed.data.teamId !== undefined;

  if (wantsRosterChange || !isSelfUpdate) {
    if (!canManageUsers(context)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

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
  }

  if (isSelfUpdate && wantsRosterChange) {
    return NextResponse.json({ error: "You cannot change your own access here." }, { status: 403 });
  }

  const nextAccessLevel = (parsed.data.accessLevel ?? targetAccessLevel) as AdminAccessLevel;
  if (parsed.data.accessLevel) {
    const grantableAccessLevels = getGrantableAccessLevels(context.accessLevel);
    if (!grantableAccessLevels.includes(parsed.data.accessLevel)) {
      return NextResponse.json({ error: "You cannot grant this access level." }, { status: 403 });
    }
  }

  const updated = await leadStore.upsertCrmUser({
    email: targetUser.email,
    fullName: parsed.data.fullName ?? targetUser.fullName,
    role: getStoredRoleForAccessLevel(nextAccessLevel),
    isActive: parsed.data.isActive ?? targetUser.isActive,
    avatarUrl:
      parsed.data.avatarUrl === undefined
        ? targetUser.avatarUrl ?? null
        : parsed.data.avatarUrl?.trim() || null,
    accessScope: parsed.data.accessScope ?? targetUser.accessScope,
    branchId:
      (parsed.data.accessScope ?? targetUser.accessScope) === "branch"
        ? parsed.data.branchId === undefined ? targetUser.branchId : parsed.data.branchId
        : null,
    departmentId:
      (parsed.data.accessScope ?? targetUser.accessScope) === "department"
        ? parsed.data.departmentId === undefined ? targetUser.departmentId : parsed.data.departmentId
        : null,
    teamId:
      (parsed.data.accessScope ?? targetUser.accessScope) === "team"
        ? parsed.data.teamId === undefined ? targetUser.teamId : parsed.data.teamId
        : null,
  });

  if (!updated) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  return NextResponse.json({ user: updated });
}
