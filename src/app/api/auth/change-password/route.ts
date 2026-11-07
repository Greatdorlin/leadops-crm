import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/admin";
import {
  changeAuthenticatedUserPassword,
} from "@/lib/auth-credentials";

import { newPasswordError } from "@/lib/security/password-policy";
import { isSameWorkspaceOrigin } from "@/lib/http/same-origin";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  if (!isSameWorkspaceOrigin(request)) {
    return NextResponse.json({ error: "Request not allowed." }, { status: 403 });
  }
  const context = await getAdminRequestContext();
  if (!context?.crmUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || newPasswordError(parsed.data.newPassword)) {
    return NextResponse.json(
      { error: parsed.success ? newPasswordError(parsed.data.newPassword) : "Check your password details." },
      { status: 400 },
    );
  }

  const changed = await changeAuthenticatedUserPassword({
    userId: context.crmUser.id,
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
  });
  if (!changed) {
    return NextResponse.json(
      { error: "Check your current password and choose a different new password." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
