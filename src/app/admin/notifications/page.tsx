import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminSignOutButton } from "@/components/admin/AdminSignOutButton";
import { NotificationInbox } from "@/components/admin/NotificationInbox";
import { getAdminAccessContext } from "@/lib/admin";
import { appRoutes } from "@/lib/app-routes";
import {
  countUnreadNotifications,
  listUserNotifications,
} from "@/lib/crm/notification-events";
import {
  notificationTypesForCategory,
  parseNotificationCategory,
} from "@/lib/crm/notification-categories";
import { encodeNotificationCursor } from "@/lib/crm/notification-pagination";
import { hasRoleAtLeast } from "@/lib/crm/roles";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { crmUser, role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.notifications);
  const params = await searchParams;
  const rawCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const rawCursor = Array.isArray(params.cursor) ? params.cursor[0] : params.cursor;
  const category = parseNotificationCategory(rawCategory);
  const includeGlobal = hasRoleAtLeast({ accessLevel, role }, "admin");

  const notificationPage = crmUser?.id
    ? await listUserNotifications(crmUser.id, {
        includeGlobal,
        includeRead: true,
        types: notificationTypesForCategory(category),
        cursor: rawCursor,
        limit: PAGE_SIZE + 1,
      })
    : [];
  const hasNextPage = notificationPage.length > PAGE_SIZE;
  const notifications = notificationPage.slice(0, PAGE_SIZE);
  const lastNotification = notifications.at(-1);
  const nextCursor = hasNextPage && lastNotification
    ? encodeNotificationCursor({
        createdAt: lastNotification.createdAt,
        id: lastNotification.id,
      })
    : null;
  const unreadCount = crmUser?.id
    ? await countUnreadNotifications(crmUser.id, { includeGlobal })
    : 0;

  return (
    <AdminShell
      activeNav="notifications"
      accessLevel={accessLevel}
      role={role}
      actualAccessLevel={actualAccessLevel}
      canSwitchAccessViews={canSwitchAccessViews}
      title="Notifications"
      description="Assigned leads, webhook captures, and follow-up alerts in one inbox."
      actions={
        <>
          <Link
            href={appRoutes.dashboard}
            className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
          >
            Back to dashboard
          </Link>
          <AdminSignOutButton />
        </>
      }
    >
      <NotificationInbox
        key={`${category}:${rawCursor ?? "first"}`}
        initialNotifications={notifications}
        unreadCount={unreadCount}
        activeCategory={category}
        nextCursor={nextCursor}
      />
    </AdminShell>
  );
}
