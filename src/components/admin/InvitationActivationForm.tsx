"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export function InvitationActivationForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "This activation link is invalid or has expired.");
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setActivated(true);
    } catch {
      setMessage("This activation link is invalid or has expired.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (activated) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm leading-6 text-emerald-100">Your password is set. You can sign in now.</p>
        <Link href="/login" className="admin-button-primary inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold">
          Continue to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block text-sm font-medium text-white" htmlFor="new-password">Create password</label>
        <input id="new-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="admin-input h-11 w-full rounded-xl px-3.5 text-sm outline-none" />
        <p className="mt-2 text-xs leading-5 text-white/60">Use 12 or more characters with at least one letter and one number.</p>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-white" htmlFor="confirm-password">Confirm password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="admin-input h-11 w-full rounded-xl px-3.5 text-sm outline-none" />
      </div>
      {message ? <p role="alert" className="text-sm text-rose-200">{message}</p> : null}
      <button type="submit" disabled={isSubmitting || !token} className="admin-button-primary inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
        {isSubmitting ? "Activating..." : "Activate account"}
      </button>
    </form>
  );
}
