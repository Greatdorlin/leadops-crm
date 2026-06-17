"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SyncChannel = "google-sheets" | "sender";

export function LeadSyncActions({
  leadId,
  canSyncSender,
}: {
  leadId: string;
  canSyncSender: boolean;
}) {
  const router = useRouter();
  const [activeChannel, setActiveChannel] = useState<SyncChannel | null>(null);
  const [message, setMessage] = useState("");

  async function runSync(channel: SyncChannel) {
    setActiveChannel(channel);
    setMessage("");

    try {
      const response = await fetch(
        channel === "google-sheets" ? "/api/google-sheets/sync" : "/api/sender/sync",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ leadId }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; syncedCount?: number; leadCount?: number }
        | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't update this tool right now.");
        setActiveChannel(null);
        return;
      }

      const syncedCount = payload?.syncedCount ?? 0;
      const leadCount = payload?.leadCount ?? 0;
      setMessage(
        syncedCount > 0
          ? `Update completed for ${syncedCount} lead${syncedCount === 1 ? "" : "s"}.`
          : `No rows were added. ${leadCount > 0 ? "The lead may already be up to date or not eligible." : ""}`.trim(),
      );
      setActiveChannel(null);
      router.refresh();
    } catch {
      setMessage("We couldn't update this tool right now.");
      setActiveChannel(null);
    }
  }

  return (
    <div className="admin-surface-soft space-y-3 rounded-[24px] p-5">
      <p className="text-sm font-medium text-slate-950">Manual updates</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={activeChannel !== null}
          onClick={() => void runSync("google-sheets")}
          className="admin-button-primary inline-flex h-12 items-center justify-center rounded-full px-5 font-semibold"
        >
          {activeChannel === "google-sheets" ? "Updating Sheets..." : "Retry Google Sheets"}
        </button>
        <button
          type="button"
          disabled={activeChannel !== null || !canSyncSender}
          onClick={() => void runSync("sender")}
          className="admin-button-secondary inline-flex h-12 items-center justify-center rounded-full px-5 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          {activeChannel === "sender" ? "Updating Sender..." : "Retry Sender"}
        </button>
      </div>
      {!canSyncSender ? (
        <p className="text-sm text-slate-500">
          Sender updates only run when marketing consent is granted.
        </p>
      ) : null}
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
