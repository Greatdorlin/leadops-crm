"use client";

import { useState } from "react";

export function ApprovedDomainRegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function submitRegistration(formData: FormData) {
    setIsSubmitting(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setIsError(true);
        setMessage(payload?.error ?? "Registration is unavailable right now.");
        return;
      }

      setMessage("Registration accepted. A workspace owner can now securely provide your activation link.");
    } catch {
      setIsError(true);
      setMessage("Registration is unavailable right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={submitRegistration} className="space-y-4">
      <div>
        <label htmlFor="registration-name" className="text-sm font-medium text-white/82">Full name</label>
        <input id="registration-name" name="fullName" required minLength={2} maxLength={120} autoComplete="name" className="admin-input mt-2 h-11 w-full rounded-2xl px-4 text-sm outline-none" />
      </div>
      <div>
        <label htmlFor="registration-email" className="text-sm font-medium text-white/82">Work email</label>
        <input id="registration-email" name="email" required type="email" maxLength={320} autoComplete="email" className="admin-input mt-2 h-11 w-full rounded-2xl px-4 text-sm outline-none" />
      </div>
      <button type="submit" disabled={isSubmitting} className="admin-button-secondary inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold disabled:opacity-60">
        {isSubmitting ? "Checking access..." : "Register with work email"}
      </button>
      {message ? <p role={isError ? "alert" : "status"} className={`text-sm leading-6 ${isError ? "text-rose-100" : "text-emerald-100"}`}>{message}</p> : null}
    </form>
  );
}
