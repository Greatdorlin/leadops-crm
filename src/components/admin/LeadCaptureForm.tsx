"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { crmLabelize } from "@/lib/crm/formatters";
import { nigeriaStateOptions } from "@/lib/nigeria-state-options";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import {
  CRM_STATUSES,
  LEAD_PRIORITIES,
  PRIMARY_GOALS,
  type CrmStatus,
  type LeadPriority,
  type LeadSource,
  type PrimaryGoal,
} from "@/lib/pathway-engine/types";
import { AdminSelect } from "./AdminSelect";

const manualSourceOptions: LeadSource[] = ["manual_entry", "agent", "referral"];

export function LeadCaptureForm({
  accessLevel,
  assigneeOptions,
  defaultAssignedTo = "",
}: {
  accessLevel: AdminAccessLevel;
  assigneeOptions: Array<{ label: string; value: string }>;
  defaultAssignedTo?: string;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [state, setState] = useState("");
  const [source, setSource] = useState<LeadSource>("manual_entry");
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | "">("");
  const [crmStatus, setCrmStatus] = useState<CrmStatus>("new");
  const [priority, setPriority] = useState<LeadPriority>("medium");
  const [assignedTo, setAssignedTo] = useState(defaultAssignedTo);
  const [sourceDetail, setSourceDetail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveLead() {
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
      const response = await fetch("/api/admin/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName: lastName || null,
          email: email || null,
          whatsappNumber: whatsappNumber || null,
          state: state || null,
          primaryGoal: primaryGoal || null,
          crmStatus,
          priority,
          assignedTo: accessLevel === "sales_rep" ? defaultAssignedTo || null : assignedTo || null,
          source,
          sourceDetail: sourceDetail || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; created?: boolean }
        | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save this lead right now.");
        setIsSaving(false);
        return;
      }

      setFirstName("");
      setLastName("");
      setEmail("");
      setWhatsappNumber("");
      setState("");
      setSource("manual_entry");
      setPrimaryGoal("");
      setCrmStatus("new");
      setPriority("medium");
      setAssignedTo(defaultAssignedTo);
      setSourceDetail("");
      setMessage(payload?.created === false ? "Existing lead updated instead of creating a duplicate." : "Lead saved.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't save this lead right now.");
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
          <AdminSelect
            value={state}
            onChange={(event) => setState(event.target.value)}
            className="h-11"
          >
            <option value="">State not set yet</option>
            {nigeriaStateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </label>
      </div>

      <div className="grid gap-3">
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
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lead source</span>
          <AdminSelect
            value={source}
            onChange={(event) => setSource(event.target.value as LeadSource)}
            className="h-11"
          >
            {manualSourceOptions.map((option) => (
              <option key={option} value={option}>
                {crmLabelize(option)}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stage</span>
          <AdminSelect
            value={crmStatus}
            onChange={(event) => setCrmStatus(event.target.value as CrmStatus)}
            className="h-11"
          >
            {CRM_STATUSES.map((option) => (
              <option key={option} value={option}>
                {crmLabelize(option)}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Priority</span>
          <AdminSelect
            value={priority}
            onChange={(event) => setPriority(event.target.value as LeadPriority)}
            className="h-11"
          >
            {LEAD_PRIORITIES.map((option) => (
              <option key={option} value={option}>
                {crmLabelize(option)}
              </option>
            ))}
          </AdminSelect>
        </label>
        {accessLevel === "sales_rep" ? null : (
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Owner</span>
            <AdminSelect
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              className="h-11"
            >
              <option value="">Assign later</option>
              {assigneeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AdminSelect>
          </label>
        )}
      </div>

      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Source note</span>
        <textarea
          value={sourceDetail}
          onChange={(event) => setSourceDetail(event.target.value)}
          rows={3}
          placeholder={
            source === "agent"
              ? "Example: Agent partner from Abuja office."
              : source === "referral"
                ? "Example: Referred by former student in Ibadan."
                : "Example: Walk-in lead after Lagos fair."
          }
          className="admin-textarea min-h-[104px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
        />
      </label>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-[18rem] text-sm leading-6 text-slate-500">
          Same CRM pipeline.
        </p>
        <button
          type="button"
          onClick={() => void saveLead()}
          disabled={isSaving}
          className="admin-button-primary h-11 min-w-[136px] self-start rounded-2xl px-5 text-sm"
        >
          {isSaving ? "Saving..." : "Save lead"}
        </button>
      </div>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
