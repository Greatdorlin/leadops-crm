"use client";

import { useState } from "react";
import type { DomainRegistrationPolicy } from "@/lib/auth-registration-policy";

export function DomainRegistrationSettings({ initialPolicy }: { initialPolicy: DomainRegistrationPolicy }) {
  const [enabled, setEnabled] = useState(initialPolicy.enabled);
  const [domains, setDomains] = useState(initialPolicy.approvedDomains.join("\n"));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function save() {
    setIsSaving(true);
    setMessage("");
    setIsError(false);

    const approvedDomains = domains
      .split(/[\n,]/)
      .map((domain) => domain.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/admin/settings/access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, approvedDomains }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        policy?: DomainRegistrationPolicy;
      } | null;
      if (!response.ok || !payload?.policy) {
        setIsError(true);
        setMessage(payload?.error ?? "We couldn't save this policy.");
        return;
      }

      setEnabled(payload.policy.enabled);
      setDomains(payload.policy.approvedDomains.join("\n"));
      setMessage("Registration policy saved.");
    } catch {
      setIsError(true);
      setMessage("We couldn't save this policy.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h2 className="text-base font-semibold text-white">Approved-domain registration</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/68">
              Keep this off unless employees should be able to register with an explicitly approved company domain.
            </p>
          </div>
          <input
            type="checkbox"
            className="admin-toggle shrink-0"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            aria-label="Enable approved-domain registration"
          />
        </div>
      </div>

      <div>
        <label htmlFor="approved-registration-domains" className="text-sm font-semibold text-white">
          Approved domains
        </label>
        <p className="mt-1 text-sm leading-6 text-white/62">Enter one domain per line. Subdomains must be listed separately.</p>
        <textarea
          id="approved-registration-domains"
          value={domains}
          onChange={(event) => setDomains(event.target.value)}
          rows={6}
          placeholder={"example.com\nteam.example.com"}
          className="admin-textarea mt-3 w-full rounded-[20px] px-4 py-3 font-mono text-sm outline-none"
        />
      </div>

      <div className="rounded-[22px] border border-amber-300/15 bg-amber-300/[0.055] p-5 text-sm leading-6 text-amber-50/85">
        Registered accounts always start as Sales Rep with own-lead scope. They cannot choose admin or owner access. Existing admin-invited accounts remain unchanged, including email addresses outside these domains.
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={() => void save()} disabled={isSaving} className="admin-button-primary inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold disabled:opacity-60">
          {isSaving ? "Saving..." : "Save registration policy"}
        </button>
        {message ? <p role={isError ? "alert" : "status"} className={`text-sm ${isError ? "text-rose-100" : "text-emerald-100"}`}>{message}</p> : null}
      </div>
    </div>
  );
}
