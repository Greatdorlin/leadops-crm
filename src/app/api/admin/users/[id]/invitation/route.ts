import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canManageTeamMember, resolveAdminAccessLevel } from "@/lib/admin-permissions";
import { getActivationBaseUrl, issueUserInvitation } from "@/lib/auth-credentials";
import { canManageUsers } from "@/lib/crm/authz";
import { leadStore } from "@/lib/storage";

export async function POST(
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

  const { id } = await params;
  const user = await leadStore.getCrmUserById(id);
  if (!user) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }
  const targetAccessLevel = resolveAdminAccessLevel({ email: user.email, role: user.role });
  if (
    !canManageTeamMember(
      context.accessLevel,
      targetAccessLevel,
      context.session.user?.email,
      user.email,
      context.permissions,
    )
  ) {
    return NextResponse.json({ error: "You cannot manage this team member." }, { status: 403 });
  }

  try {
    const requestOrigin = process.env.NODE_ENV === "production" ? null : new URL(request.url).origin;
    const invitation = await issueUserInvitation({
      userId: user.id,
      createdBy: context.session.user?.email ?? "",
      baseUrl: getActivationBaseUrl() ?? requestOrigin,
    });
    return NextResponse.json({
      activationUrl: invitation.activationUrl,
      invitationExpiresAt: invitation.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[admin:users:renew-invitation]", error);
    return NextResponse.json(
      { error: "We couldn't create an activation link right now." },
      { status: 500 },
    );
  }
}
