"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";

export function ChangePasswordForm({ disabled = false }: { disabled?: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "Password could not be changed.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
      setMessage("Password changed. Use it the next time you sign in.");
    } catch {
      setMessage("Password could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/[0.06] text-cyan-100"><KeyRound className="h-5 w-5" /></span>
        <div>
          <h2 className="text-lg font-bold text-white">Change password</h2>
          <p className="mt-1 text-sm leading-6 text-white/65">Only you can change your password. Your current password is required.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Current password</span>
          <input type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="admin-input h-12 w-full rounded-2xl px-4 text-sm outline-none" />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">New password</span>
          <input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="admin-input h-12 w-full rounded-2xl px-4 text-sm outline-none" />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Confirm password</span>
          <input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="admin-input h-12 w-full rounded-2xl px-4 text-sm outline-none" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={disabled || busy} className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold disabled:opacity-50">{busy ? "Changing..." : "Change password"}</button>
        {message ? <p role="status" className={success ? "text-sm text-emerald-200" : "text-sm text-rose-100"}>{message}</p> : null}
      </div>
    </form>
  );
}
