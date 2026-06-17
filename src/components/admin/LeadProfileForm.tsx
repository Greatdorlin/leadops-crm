"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { crmLabelize } from "@/lib/crm/formatters";
import { nigeriaStateOptions } from "@/lib/nigeria-state-options";
import { PRIMARY_GOALS, type PrimaryGoal } from "@/lib/pathway-engine/types";
import { AdminSelect } from "./AdminSelect";

export function LeadProfileForm({
  leadId,
  initialFirstName,
  initialLastName,
  initialEmail,
  initialWhatsappNumber,
  initialState,
  initialPrimaryGoal,
}: {
  leadId: string;
  initialFirstName: string;
  initialLastName: string;
  initialEmail: string;
  initialWhatsappNumber: string;
  initialState: string | null;
  initialPrimaryGoal: PrimaryGoal | null;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsappNumber);
  const [state, setState] = useState(initialState ?? "");
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | "">(initialPrimaryGoal ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveLeadProfile() {
    if (!firstName.trim()) {
      setMessage("Add the lead's first name before saving.");
      return;
    }

    if (!email.trim() && !whatsappNumber.trim()) {
      setMessage("Add an email or WhatsApp number before saving.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim() || null,
          email: email.trim() || null,
          whatsappNumber: whatsappNumber.trim() || null,
          state: state || null,
          primaryGoal: primaryGoal || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't update this lead right now.");
        setIsSaving(false);
        return;
      }

      setMessage("Lead profile updated.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't update this lead right now.");
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(250,251,255,0.98)_0%,rgba(255,252,247,0.95)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="mb-4 rounded-[18px] border border-slate-200/70 bg-white/72 px-4 py-3 text-sm leading-6 text-slate-500">
        Keep the lead profile accurate so exports, follow-ups, and attribution stay reliable.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">First name</span>
          <input
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Ada"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Last name</span>
          <input
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Okafor"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="lead@example.com"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">WhatsApp</span>
          <input
            type="text"
            value={whatsappNumber}
            onChange={(event) => setWhatsappNumber(event.target.value)}
            placeholder="+234 801 234 5678"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">State</span>
          <AdminSelect value={state} onChange={(event) => setState(event.target.value)} className="h-11">
            <option value="">State not set yet</option>
            {nigeriaStateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Goal</span>
          <AdminSelect
            value={primaryGoal}
            onChange={(event) => setPrimaryGoal(event.target.value as PrimaryGoal | "")}
            className="h-11"
          >
            <option value="">Not set yet</option>
            {PRIMARY_GOALS.map((option) => (
              <option key={option} value={option}>
                {crmLabelize(option)}
              </option>
            ))}
          </AdminSelect>
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-200/80 pt-4">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void saveLeadProfile()}
          className="admin-button-primary h-12 w-full rounded-2xl px-5 text-sm"
        >
          {isSaving ? "Saving..." : "Save profile"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
