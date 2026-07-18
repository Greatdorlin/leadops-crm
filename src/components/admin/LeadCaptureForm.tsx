"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CRM_STATUSES, LEAD_PRIORITIES } from "@/lib/crm/constants";
import {
  buildCustomFieldInputModel,
  type CustomFieldDefinitionWithOptions,
} from "@/lib/crm/custom-field-values";
import { crmLabelize } from "@/lib/crm/formatters";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import {
  type LeadCustomerType,
  type LeadPriority,
  type LeadSource,
} from "@/lib/crm/types";
import { CustomFieldValueInputs } from "./CustomFieldValueInputs";
import { AdminSelect } from "./AdminSelect";
import { SmoothButton } from "./ui/SmoothButton";
import { CitySearchInput, CountrySearchInput } from "./CountrySearchInput";

const manualSourceOptions: LeadSource[] = ["manual_entry", "agent", "referral"];
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-white/70";
const panelClass =
  "min-w-0 space-y-3 rounded-[24px] border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-4";

export function LeadCaptureForm({
  accessLevel,
  assigneeOptions,
  defaultAssignedTo = "",
  customFieldDefinitions = [],
  stageOptions = CRM_STATUSES.map((status) => ({ value: status, key: status, label: crmLabelize(status) })),
}: {
  accessLevel: AdminAccessLevel;
  assigneeOptions: Array<{ label: string; value: string }>;
  defaultAssignedTo?: string;
  customFieldDefinitions?: CustomFieldDefinitionWithOptions[];
  stageOptions?: Array<{ value: string; key: string; label: string; stageId?: string }>;
}) {
  const customFieldInputModel = buildCustomFieldInputModel(
    customFieldDefinitions.filter((field) => field.showInForm),
  );
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [leadCustomerType, setLeadCustomerType] = useState<LeadCustomerType>("direct");
  const [source, setSource] = useState<LeadSource>("manual_entry");
  const defaultStageValue =
    stageOptions.find((option) => option.key === "new")?.value ?? stageOptions[0]?.value ?? "new";
  const [stage, setStage] = useState(defaultStageValue);
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
      const selectedStage = stageOptions.find((option) => option.value === stage);
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
          country: country.trim() || null,
          region: region.trim() || null,
          city: city.trim() || null,
          address: address.trim() || null,
          postalCode: postalCode.trim() || null,
          companyName: companyName.trim() || null,
          leadCustomerType,
          ...(selectedStage?.stageId
            ? { stageId: selectedStage.stageId }
            : { stage: selectedStage?.key ?? "new" }),
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
      setCountry("");
      setRegion("");
      setCity("");
      setAddress("");
      setPostalCode("");
      setCompanyName("");
      setLeadCustomerType("direct");
      setSource("manual_entry");
      setStage(defaultStageValue);
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
          <span className={labelClass}>First name</span>
          <input
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Ada"
            className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Last name</span>
          <input
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Okafor"
            className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="space-y-3 sm:col-span-2">
          <p className={labelClass}>Lead type</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { value: "direct", label: "Individual lead", hint: "Individual buyer or household." },
              { value: "business", label: "Company lead", hint: "Company, partner, or B2B account." },
            ].map((option) => {
              const selected = leadCustomerType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLeadCustomerType(option.value as LeadCustomerType)}
                  className={[
                    "rounded-[22px] border px-4 py-3 text-left transition",
                    selected
                      ? "border-white/20 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ld-color-primary)_30%,transparent),color-mix(in_srgb,var(--ld-color-accent)_22%,transparent))] text-white shadow-[0_12px_28px_color-mix(in_srgb,var(--ld-color-primary)_18%,transparent)]"
                      : "border-white/10 bg-white/[0.045] text-white/72 hover:border-white/20 hover:bg-white/[0.07]",
                  ].join(" ")}
                  aria-pressed={selected}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-white/70">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </section>
        <label className="space-y-2">
          <span className={labelClass}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="lead@example.com"
            className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>WhatsApp</span>
          <input
            type="text"
            value={whatsappNumber}
            onChange={(event) => setWhatsappNumber(event.target.value)}
            placeholder="+234 801 234 5678"
            className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Company</span>
          <input
            type="text"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="Northwind Ventures"
            className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CountrySearchInput value={country} onChange={setCountry} />
        <label className="space-y-2">
          <span className={labelClass}>State/Province/Region</span>
          <input
            type="text"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            placeholder="California"
            className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <CitySearchInput value={city} onChange={setCity} />
        <label className="space-y-2">
          <span className={labelClass}>Postal Code</span>
          <input
            type="text"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            placeholder="94105"
            className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2 sm:col-span-2">
          <span className={labelClass}>Address</span>
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Street address"
            className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
      </div>

      <div className="grid gap-3">
        <label className="relative space-y-2">
          <span className={labelClass}>Lead source</span>
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
        <label className="relative space-y-2">
          <span className={labelClass}>Stage</span>
          <AdminSelect
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            className="h-11"
          >
            {stageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="relative space-y-2">
          <span className={labelClass}>Priority</span>
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
          <label className="relative space-y-2">
            <span className={labelClass}>Owner</span>
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
        <span className={labelClass}>Source note</span>
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
          className="admin-textarea ld-focus-ring min-h-[104px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
        />
      </label>

      <section className={panelClass}>
        <div>
          <p className={labelClass}>
            Sales details
          </p>
          <p className="mt-1 text-sm text-white/70">Capture the next follow-up and potential value.</p>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="min-w-0 space-y-2">
            <span className={labelClass}>Next follow-up</span>
            <input
              type="datetime-local"
              value={nextFollowUpAt}
              onChange={(event) => setNextFollowUpAt(event.target.value)}
              className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
            />
          </label>
          <label className="min-w-0 space-y-2">
            <span className={labelClass}>Estimated value</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={estimatedValue}
              onChange={(event) => setEstimatedValue(event.target.value)}
              placeholder="250000"
              className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
            />
          </label>
          <label className="min-w-0 space-y-2">
            <span className={labelClass}>Close probability</span>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={closeProbability}
              onChange={(event) => setCloseProbability(event.target.value)}
              placeholder="60"
              className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
            />
          </label>
          <label className="min-w-0 space-y-2">
            <span className={labelClass}>Expected close date</span>
            <input
              type="datetime-local"
              value={expectedCloseDate}
              onChange={(event) => setExpectedCloseDate(event.target.value)}
              className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
            />
          </label>
        </div>
      </section>

      {customFieldInputModel.length > 0 ? (
        <section className={panelClass}>
          <div>
            <p className={labelClass}>
              Extra lead details
            </p>
            <p className="mt-1 text-sm text-white/70">Capture business-specific details.</p>
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

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-[18rem] text-sm leading-6 text-white/70">
          Saved into your sales pipeline.
        </p>
        <SmoothButton
          variant="primary"
          size="md"
          onClick={() => void saveLead()}
          loading={isSaving}
        >
          Save lead
        </SmoothButton>
      </div>
      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </div>
  );
}
