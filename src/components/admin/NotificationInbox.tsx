"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NotificationEventRecord } from "@/lib/crm/notification-events";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import { appRoutes } from "@/lib/app-routes";
import {
  categoryForNotificationType,
  notificationCategoryOptions,
  type NotificationCategory,
} from "@/lib/crm/notification-categories";
import { EmptyState } from "./EmptyState";

export function NotificationInbox({
  initialNotifications,
  unreadCount,
  activeCategory,
  nextCursor,
  demoMode = false,
}: {
  initialNotifications: NotificationEventRecord[];
  unreadCount: number;
  activeCategory: NotificationCategory;
  nextCursor: string | null;
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function markRead(notificationId: string) {
    setPendingId(notificationId);
    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read" }),
      });

      if (!response.ok) {
        setPendingId(null);
        return;
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                status: "read",
                readAt: new Date().toISOString(),
              }
            : notification,
        ),
      );
      setPendingId(null);
      startTransition(() => router.refresh());
    } catch {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="ld-glass-card ld-glass-soft flex flex-col gap-3 rounded-[24px] p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="text-base font-semibold tracking-[-0.02em] text-white">Recent activity</h2>
          <span className="inline-flex w-fit shrink-0 rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-white/76">
            {unreadCount} unread
          </span>
        </div>
        <nav className="flex min-w-0 gap-1 overflow-x-auto" aria-label="Notification categories">
          {notificationCategoryOptions.map((category) => {
            const isActive = category.value === activeCategory;
            const href =
              category.value === "all"
                ? appRoutes.notifications
                : `${appRoutes.notifications}?category=${category.value}`;
            return (
              <Link
                key={category.value}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "ld-focus-ring inline-flex min-h-10 shrink-0 items-center rounded-[16px] border px-3.5 text-sm font-semibold transition",
                  isActive
                    ? "border-[color:var(--ld-color-accent)]/32 bg-[color:var(--ld-color-primary)]/24 text-white shadow-[0_10px_24px_rgba(3,8,28,0.2)]"
                    : "border-transparent text-white/68 hover:border-white/10 hover:bg-white/[0.065] hover:text-white",
                ].join(" ")}
              >
                {category.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title={activeCategory === "all" ? "No notifications yet" : "Nothing in this category"}
          description="New lead activity and follow-up alerts will appear here."
        />
      ) : (
      <div className="space-y-3">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className="admin-surface-soft rounded-[24px] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-white">{notification.title}</p>
                  <span className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/64">
                    {notificationCategoryOptions.find(
                      (category) => category.value === categoryForNotificationType(notification.type),
                    )?.label ?? "System"}
                  </span>
                  {notification.readAt ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs font-semibold text-white/70">
                      Read
                    </span>
                  ) : (
                    <span className="rounded-full border border-[var(--ld-color-primary)]/24 bg-[var(--ld-color-primary)]/10 px-3 py-1 text-xs font-semibold text-white">
                      Unread
                    </span>
                  )}
                </div>
                <p className="text-sm leading-6 text-white/70">{notification.message}</p>
                <p className="text-xs uppercase tracking-[0.14em] text-white/70">
                  {formatCrmDateTime(notification.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {notification.leadId ? (
                  <Link
                    href={appRoutes.lead(notification.leadId)}
                    className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium"
                  >
                    Open lead
                  </Link>
                ) : null}
                {!notification.readAt && !demoMode ? (
                  <button
                    type="button"
                    disabled={pendingId === notification.id}
                    onClick={() => void markRead(notification.id)}
                    className="admin-button-primary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold"
                  >
                    {pendingId === notification.id ? "Saving..." : "Mark read"}
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
      )}

      {nextCursor ? (
        <div className="flex justify-center pt-2">
          <Link
            href={`${appRoutes.notifications}?${new URLSearchParams({
              ...(activeCategory === "all" ? {} : { category: activeCategory }),
              cursor: nextCursor,
            }).toString()}`}
            className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold"
          >
            Load older notifications
          </Link>
        </div>
      ) : null}
    </div>
  );
}
