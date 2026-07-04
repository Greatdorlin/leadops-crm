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

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const { crmUser, role, accessLevel, actualAccessLevel, canSwitchAccessViews } =
    await getAdminAccessContext(appRoutes.notifications);

  const notifications = crmUser?.id
    ? await listUserNotifications(crmUser.id, { includeGlobal: true, includeRead: true })
    : [];
  const unreadCount = crmUser?.id
    ? await countUnreadNotifications(crmUser.id, { includeGlobal: true })
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
      <NotificationInbox initialNotifications={notifications} unreadCount={unreadCount} />
    </AdminShell>
  );
}
