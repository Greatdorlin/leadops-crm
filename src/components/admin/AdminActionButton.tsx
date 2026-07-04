"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminActionButton({
  endpoint,
  label,
  loadingLabel,
  body,
  variant = "secondary",
}: {
  endpoint: string;
  label: string;
  loadingLabel?: string;
  body?: Record<string, unknown>;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");

  async function runAction() {
    setIsRunning(true);
    setMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body ?? {}),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; ok?: boolean }
        | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "This action could not be completed.");
        setIsRunning(false);
        return;
      }

      setMessage("Action completed.");
      setIsRunning(false);
      router.refresh();
    } catch {
      setMessage("This action could not be completed.");
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void runAction()}
        disabled={isRunning}
        className={
          variant === "primary"
            ? "admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold"
            : "admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium"
        }
      >
        {isRunning ? loadingLabel || "Working..." : label}
      </button>
      {message ? <p className="text-xs text-white/70">{message}</p> : null}
    </div>
  );
}
