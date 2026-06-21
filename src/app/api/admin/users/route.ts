import { NextResponse } from "next/server";
import { z } from "zod";
import { isMasterAdminEmail, normalizeAdminEmail } from "@/lib/admin-access";
import { getAdminRequestContext } from "@/lib/admin";
import {
  ADMIN_ACCESS_LEVELS,
  getGrantableAccessLevels,
  getStoredRoleForAccessLevel,
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

const crmUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(1, "Full name is required."),
  accessLevel: z.enum(ADMIN_ACCESS_LEVELS),
  isActive: z.boolean().optional(),
  avatarUrl: avatarImageSchema.optional(),
});

export async function POST(request: Request) {
  const context = await getAdminRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageUsers({ accessLevel: context.accessLevel, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = crmUserSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid team access payload." }, { status: 400 });
  }

  const normalizedEmail = normalizeAdminEmail(parsed.data.email);
  const lockedAsMaster = isMasterAdminEmail(normalizedEmail);
  const grantableAccessLevels = getGrantableAccessLevels(context.accessLevel);

  if (
    !lockedAsMaster &&
    !grantableAccessLevels.includes(parsed.data.accessLevel)
  ) {
    return NextResponse.json({ error: "You cannot grant this access level." }, { status: 403 });
  }

  if (
    !lockedAsMaster &&
    normalizeAdminEmail(context.session.user?.email ?? "") === normalizedEmail
  ) {
    return NextResponse.json({ error: "You cannot change your own access here." }, { status: 403 });
  }

  const user = await leadStore.upsertCrmUser({
    email: normalizedEmail,
    fullName: parsed.data.fullName,
    role: getStoredRoleForAccessLevel(
      lockedAsMaster ? "master_admin" : parsed.data.accessLevel,
    ),
    isActive: lockedAsMaster ? true : parsed.data.isActive ?? true,
    avatarUrl: parsed.data.avatarUrl?.trim() || null,
  });

  return NextResponse.json({ user });
}
