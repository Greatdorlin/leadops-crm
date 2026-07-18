"use client";

import { useState } from "react";

export function UserInvitationButton({ userId }: { userId: string }) {
  const [activationUrl, setActivationUrl] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function renewInvitation() {
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${userId}/invitation`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as {
        activationUrl?: string;
        error?: string;
      } | null;
      if (!response.ok || !payload?.activationUrl) {
        setMessage(payload?.error ?? "We couldn't create an activation link right now.");
        return;
      }

      setActivationUrl(payload.activationUrl);
      setMessage("New activation link ready. Earlier unused links no longer work.");
    } catch {
      setMessage("We couldn't create an activation link right now.");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(activationUrl);
      setMessage("Activation link copied.");
    } catch {
      setMessage("Select and copy the activation link below.");
    }
  }

  return (
    <div className="w-full space-y-2 sm:w-auto">
      <button type="button" onClick={() => void renewInvitation()} disabled={isLoading} className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium disabled:opacity-60">
        {isLoading ? "Creating link..." : "Renew activation link"}
      </button>
      {activationUrl ? (
        <div className="flex max-w-xl flex-col gap-2 sm:flex-row">
          <input readOnly aria-label="Activation link" value={activationUrl} onFocus={(event) => event.currentTarget.select()} className="admin-input h-10 min-w-0 flex-1 rounded-xl px-3 text-xs outline-none" />
          <button type="button" onClick={() => void copyInvitation()} className="admin-button-primary h-10 rounded-xl px-4 text-sm font-semibold">Copy</button>
        </div>
      ) : null}
      {message ? <p className="text-xs leading-5 text-white/70">{message}</p> : null}
    </div>
  );
}
