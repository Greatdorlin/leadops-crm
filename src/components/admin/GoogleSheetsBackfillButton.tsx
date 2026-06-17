"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GoogleSheetsBackfillButton() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");

  async function runBackfill() {
    setIsRunning(true);
    setMessage("");

    try {
      const response = await fetch("/api/google-sheets/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; syncedCount?: number; leadCount?: number }
        | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't update Google Sheets right now.");
        setIsRunning(false);
        return;
      }

      const syncedCount = payload?.syncedCount ?? 0;
      const leadCount = payload?.leadCount ?? 0;
      setMessage(
        leadCount === 0
          ? "Google Sheets is already up to date."
          : `Google Sheets updated. ${syncedCount} of ${leadCount} lead${leadCount === 1 ? "" : "s"} added.`,
      );
      setIsRunning(false);
      router.refresh();
    } catch {
      setMessage("We couldn't update Google Sheets right now.");
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isRunning}
        onClick={() => void runBackfill()}
        className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
      >
        {isRunning ? "Updating Sheets..." : "Update Sheets"}
      </button>
      {message ? <p className="text-right text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
