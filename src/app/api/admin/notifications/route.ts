import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/admin";
import { canAccessAdmin } from "@/lib/crm/authz";
import { hasRoleAtLeast } from "@/lib/crm/roles";
import { countUnreadNotifications, listUserNotifications } from "@/lib/crm/notification-events";
import {
  notificationTypesForCategory,
  parseNotificationCategory,
} from "@/lib/crm/notification-categories";
import { encodeNotificationCursor } from "@/lib/crm/notification-pagination";

const PAGE_SIZE = 30;

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
  const category = parseNotificationCategory(searchParams.get("category"));
  const cursor = searchParams.get("cursor") ?? undefined;
  const includeGlobal = hasRoleAtLeast({ accessLevel: context.accessLevel, role: context.role }, "admin");
  const notificationAccess = {
    accessLevel: context.accessLevel,
    currentUserEmail: context.session.user?.email,
    currentUser: context.crmUser,
    permissions: context.permissions,
  };
  const notificationPage = await listUserNotifications(
    context.crmUser.id,
    notificationAccess,
    {
      includeRead,
      includeGlobal,
      types: notificationTypesForCategory(category),
      cursor,
      limit: PAGE_SIZE + 1,
    },
  );
  const hasNextPage = notificationPage.length > PAGE_SIZE;
  const notifications = notificationPage.slice(0, PAGE_SIZE);
  const lastNotification = notifications.at(-1);
  const nextCursor = hasNextPage && lastNotification
    ? encodeNotificationCursor({ createdAt: lastNotification.createdAt, id: lastNotification.id })
    : null;
  const unreadCount = await countUnreadNotifications(
    context.crmUser.id,
    notificationAccess,
    { includeGlobal },
  );

  return NextResponse.json({
    notifications,
    unreadCount,
    nextCursor,
  });
}
