"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildCustomFieldInputModel,
  type CustomFieldDefinitionWithOptions,
} from "@/lib/crm/custom-field-values";
import { PRIMARY_GOALS } from "@/lib/crm/constants";
import { crmLabelize } from "@/lib/crm/formatters";
import { nigeriaStateOptions } from "@/lib/nigeria-state-options";
import type { PrimaryGoal } from "@/lib/crm/types";
import { CustomFieldValueInputs } from "./CustomFieldValueInputs";
import { AdminSelect } from "./AdminSelect";

function formatDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

export function LeadProfileForm({
  leadId,
  initialFirstName,
  initialLastName,
  initialEmail,
  initialWhatsappNumber,
  initialState,
  initialCompanyName,
  initialPrimaryGoal,
  initialEstimatedValue,
  initialCloseProbability,
  initialExpectedCloseDate,
  initialNextFollowUpAt,
  initialWonValue,
  initialLostReason,
  customFieldDefinitions = [],
  initialCustomFieldValues = [],
}: {
  leadId: string;
  initialFirstName: string;
  initialLastName: string;
  initialEmail: string;
  initialWhatsappNumber: string;
  initialState: string | null;
  initialCompanyName?: string | null;
  initialPrimaryGoal: PrimaryGoal | null;
  initialEstimatedValue?: number | null;
  initialCloseProbability?: number | null;
  initialExpectedCloseDate?: string | null;
  initialNextFollowUpAt?: string | null;
  initialWonValue?: number | null;
  initialLostReason?: string | null;
  customFieldDefinitions?: CustomFieldDefinitionWithOptions[];
  initialCustomFieldValues?: Array<{ customFieldId: string; value: unknown }>;
}) {
  const customFieldInputModel = buildCustomFieldInputModel(
    customFieldDefinitions.filter((field) => field.showInForm),
    initialCustomFieldValues,
  );
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsappNumber);
  const [state, setState] = useState(initialState ?? "");
  const [companyName, setCompanyName] = useState(initialCompanyName ?? "");
  const [category, setCategory] = useState<PrimaryGoal | "">(initialPrimaryGoal ?? "");
  const [estimatedValue, setEstimatedValue] = useState(
    initialEstimatedValue === null || initialEstimatedValue === undefined ? "" : String(initialEstimatedValue),
  );
  const [closeProbability, setCloseProbability] = useState(
    initialCloseProbability === null || initialCloseProbability === undefined
      ? ""
      : String(initialCloseProbability),
  );
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    formatDateTimeLocalValue(initialExpectedCloseDate),
  );
  const [nextFollowUpAt, setNextFollowUpAt] = useState(
    formatDateTimeLocalValue(initialNextFollowUpAt),
  );
  const [wonValue, setWonValue] = useState(
    initialWonValue === null || initialWonValue === undefined ? "" : String(initialWonValue),
  );
  const [lostReason, setLostReason] = useState(initialLostReason ?? "");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(customFieldInputModel.map((field) => [field.fieldId, field.value])),
  );
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
          companyName: companyName.trim() || null,
          category: category || null,
          estimatedValue: estimatedValue ? Number(estimatedValue) : null,
          closeProbability: closeProbability ? Number(closeProbability) : null,
          expectedCloseDate: expectedCloseDate || null,
          nextFollowUpAt: nextFollowUpAt || null,
          wonValue: wonValue ? Number(wonValue) : null,
          lostReason: lostReason.trim() || null,
          customFieldValues,
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
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Category</span>
          <AdminSelect
            value={category}
            onChange={(event) => setCategory(event.target.value as PrimaryGoal | "")}
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
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Company</span>
          <input
            type="text"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="Northwind Ventures"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
      </div>

      <section className="mt-4 space-y-3 rounded-[24px] border border-slate-200/85 bg-slate-50/70 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Sales details
          </p>
          <p className="mt-1 text-sm text-slate-600">Keep pipeline value, follow-up timing, and outcomes current as the lead moves.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next follow-up</span>
            <input
              type="datetime-local"
              value={nextFollowUpAt}
              onChange={(event) => setNextFollowUpAt(event.target.value)}
              className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Estimated value</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={estimatedValue}
              onChange={(event) => setEstimatedValue(event.target.value)}
              className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Close probability</span>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={closeProbability}
              onChange={(event) => setCloseProbability(event.target.value)}
              className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Expected close date</span>
            <input
              type="datetime-local"
              value={expectedCloseDate}
              onChange={(event) => setExpectedCloseDate(event.target.value)}
              className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Won value</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={wonValue}
              onChange={(event) => setWonValue(event.target.value)}
              className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
            />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lost reason</span>
            <textarea
              value={lostReason}
              onChange={(event) => setLostReason(event.target.value)}
              rows={3}
              placeholder="Why the lead was lost, if known."
              className="admin-textarea min-h-[104px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
            />
          </label>
        </div>
      </section>

      {customFieldInputModel.length > 0 ? (
        <section className="mt-4 space-y-3 rounded-[24px] border border-slate-200/85 bg-slate-50/70 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Extra lead details
            </p>
            <p className="mt-1 text-sm text-slate-600">Keep the business-specific details current as this lead moves.</p>
          </div>
          <CustomFieldValueInputs
            fields={customFieldInputModel}
            values={customFieldValues}
            onChange={(fieldId, value) =>
              setCustomFieldValues((current) => ({
                ...current,
                [fieldId]: value,
              }))
            }
          />
        </section>
      ) : null}

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
