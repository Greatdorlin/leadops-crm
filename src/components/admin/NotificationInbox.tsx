"use client";

import { startTransition, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NotificationEventRecord } from "@/lib/crm/notification-events";
import { formatCrmDateTime } from "@/lib/crm/formatters";
import { EmptyState } from "./EmptyState";

export function NotificationInbox({
  initialNotifications,
  unreadCount,
}: {
  initialNotifications: NotificationEventRecord[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const activeUnreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

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

  if (notifications.length === 0) {
    return (
      <EmptyState
        title="No notifications yet"
        description="Assigned leads, webhook captures, and follow-up alerts will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Unread</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {activeUnreadCount}
          </p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Loaded</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {Math.max(unreadCount, notifications.length)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,255,0.94)_100%)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-slate-950">{notification.title}</p>
                  {notification.readAt ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      Read
                    </span>
                  ) : (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      Unread
                    </span>
                  )}
                </div>
                <p className="text-sm leading-6 text-slate-600">{notification.message}</p>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                  {formatCrmDateTime(notification.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {notification.leadId ? (
                  <Link
                    href={`/admin/leads/${notification.leadId}`}
                    className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium"
                  >
                    Open lead
                  </Link>
                ) : null}
                {!notification.readAt ? (
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
    </div>
  );
}
