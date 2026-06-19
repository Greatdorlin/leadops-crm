import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canAccessAdmin } from "@/lib/crm/authz";
import { hasRoleAtLeast } from "@/lib/crm/roles";
import { countUnreadNotifications, listUserNotifications } from "@/lib/crm/notification-events";

export async function GET(request: Request) {
  const context = await getAdminRequestContext();
  if (!context?.crmUser?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canAccessAdmin({ accessLevel: context.accessLevel, email: context.session.user?.email, role: context.role })) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const includeRead = searchParams.get("includeRead") === "true";
  const includeGlobal = hasRoleAtLeast({ accessLevel: context.accessLevel, role: context.role }, "admin");
  const notifications = await listUserNotifications(context.crmUser.id, {
    includeRead,
    includeGlobal,
  });
  const unreadCount = await countUnreadNotifications(context.crmUser.id, {
    includeGlobal,
  });

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}
