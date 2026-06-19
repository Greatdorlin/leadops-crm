"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CRM_STATUSES, LEAD_PRIORITIES, PRIMARY_GOALS } from "@/lib/crm/constants";
import {
  buildCustomFieldInputModel,
  type CustomFieldDefinitionWithOptions,
} from "@/lib/crm/custom-field-values";
import { crmLabelize } from "@/lib/crm/formatters";
import { nigeriaStateOptions } from "@/lib/nigeria-state-options";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import {
  type CrmStatus,
  type LeadPriority,
  type LeadSource,
  type PrimaryGoal,
} from "@/lib/crm/types";
import { CustomFieldValueInputs } from "./CustomFieldValueInputs";
import { AdminSelect } from "./AdminSelect";

const manualSourceOptions: LeadSource[] = ["manual_entry", "agent", "referral"];

export function LeadCaptureForm({
  accessLevel,
  assigneeOptions,
  defaultAssignedTo = "",
  customFieldDefinitions = [],
  stageOptions = CRM_STATUSES.map((status) => ({ value: status, label: crmLabelize(status) })),
}: {
  accessLevel: AdminAccessLevel;
  assigneeOptions: Array<{ label: string; value: string }>;
  defaultAssignedTo?: string;
  customFieldDefinitions?: CustomFieldDefinitionWithOptions[];
  stageOptions?: Array<{ value: CrmStatus; label: string }>;
}) {
  const customFieldInputModel = buildCustomFieldInputModel(
    customFieldDefinitions.filter((field) => field.showInForm),
  );
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [state, setState] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [source, setSource] = useState<LeadSource>("manual_entry");
  const [category, setCategory] = useState<PrimaryGoal | "">("");
  const [stage, setStage] = useState<CrmStatus>("new");
  const [priority, setPriority] = useState<LeadPriority>("medium");
  const [assignedTo, setAssignedTo] = useState(defaultAssignedTo);
  const [sourceDetail, setSourceDetail] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [closeProbability, setCloseProbability] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(customFieldInputModel.map((field) => [field.fieldId, field.value])),
  );
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
          firstName: firstName.trim(),
          lastName: lastName.trim() || null,
          email: email.trim() || null,
          whatsappNumber: whatsappNumber.trim() || null,
          state: state || null,
          companyName: companyName.trim() || null,
          category: category || null,
          stage,
          priority,
          assignedTo: accessLevel === "sales_rep" ? defaultAssignedTo || null : assignedTo || null,
          source,
          sourceDetail: sourceDetail.trim() || null,
          estimatedValue: estimatedValue ? Number(estimatedValue) : null,
          closeProbability: closeProbability ? Number(closeProbability) : null,
          expectedCloseDate: expectedCloseDate || null,
          nextFollowUpAt: nextFollowUpAt || null,
          customFieldValues,
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
      setCompanyName("");
      setSource("manual_entry");
      setCategory("");
      setStage("new");
      setPriority("medium");
      setAssignedTo(defaultAssignedTo);
      setSourceDetail("");
      setEstimatedValue("");
      setCloseProbability("");
      setExpectedCloseDate("");
      setNextFollowUpAt("");
      setCustomFieldValues(
        Object.fromEntries(customFieldInputModel.map((field) => [field.fieldId, field.value])),
      );
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

      <div className="grid gap-3">
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
            value={stage}
            onChange={(event) => setStage(event.target.value as CrmStatus)}
            className="h-11"
          >
            {stageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
                ? "Example: Referred by a former client in Ibadan."
                : "Example: Walk-in lead after an office visit."
          }
          className="admin-textarea min-h-[104px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
        />
      </label>

      <section className="space-y-3 rounded-[24px] border border-slate-200/85 bg-slate-50/70 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Sales details
          </p>
          <p className="mt-1 text-sm text-slate-600">Capture the next follow-up and the value this lead could bring in.</p>
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
              placeholder="250000"
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
              placeholder="60"
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
        </div>
      </section>

      {customFieldInputModel.length > 0 ? (
        <section className="space-y-3 rounded-[24px] border border-slate-200/85 bg-slate-50/70 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Extra lead details
            </p>
            <p className="mt-1 text-sm text-slate-600">Capture the extra business-specific details this lead came with.</p>
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
