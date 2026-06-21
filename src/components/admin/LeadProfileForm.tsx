"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildCustomFieldInputModel,
  type CustomFieldDefinitionWithOptions,
} from "@/lib/crm/custom-field-values";
import type { LeadCustomerType } from "@/lib/crm/types";
import { CustomFieldValueInputs } from "./CustomFieldValueInputs";

type ProfileInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
};

const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-white/54";
const panelClass =
  "mt-4 space-y-3 rounded-[24px] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

function formatDateTimeLocalValue(value?: string | null) {
  return value ? value.slice(0, 16) : "";
}

function ProfileInput({ label, value, onChange, placeholder, type = "text", className }: ProfileInputProps) {
  return (
    <label className={["space-y-2", className].filter(Boolean).join(" ")}>
      <span className={labelClass}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
      />
    </label>
  );
}

export function LeadProfileForm({
  leadId,
  initialFirstName,
  initialLastName,
  initialEmail,
  initialWhatsappNumber,
  initialState,
  initialCountry,
  initialRegion,
  initialCity,
  initialAddress,
  initialPostalCode,
  initialCompanyName,
  initialLeadCustomerType,
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
  initialCountry?: string | null;
  initialRegion?: string | null;
  initialCity?: string | null;
  initialAddress?: string | null;
  initialPostalCode?: string | null;
  initialCompanyName?: string | null;
  initialLeadCustomerType?: LeadCustomerType | null;
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
  const [country, setCountry] = useState(initialCountry ?? "");
  const [region, setRegion] = useState(initialRegion ?? "");
  const [city, setCity] = useState(initialCity ?? "");
  const [address, setAddress] = useState(initialAddress ?? "");
  const [postalCode, setPostalCode] = useState(initialPostalCode ?? "");
  const [companyName, setCompanyName] = useState(initialCompanyName ?? "");
  const [leadCustomerType, setLeadCustomerType] = useState<LeadCustomerType>(
    initialLeadCustomerType ?? "direct",
  );
  const [estimatedValue, setEstimatedValue] = useState(initialEstimatedValue == null ? "" : String(initialEstimatedValue));
  const [closeProbability, setCloseProbability] = useState(initialCloseProbability == null ? "" : String(initialCloseProbability));
  const [expectedCloseDate, setExpectedCloseDate] = useState(formatDateTimeLocalValue(initialExpectedCloseDate));
  const [nextFollowUpAt, setNextFollowUpAt] = useState(formatDateTimeLocalValue(initialNextFollowUpAt));
  const [wonValue, setWonValue] = useState(initialWonValue == null ? "" : String(initialWonValue));
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim() || null,
          email: email.trim() || null,
          whatsappNumber: whatsappNumber.trim() || null,
          state: state || null,
          country: country.trim() || null,
          region: region.trim() || null,
          city: city.trim() || null,
          address: address.trim() || null,
          postalCode: postalCode.trim() || null,
          companyName: companyName.trim() || null,
          leadCustomerType,
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
    <div className="ld-glass-card ld-glass-soft rounded-[24px] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="space-y-3 sm:col-span-2">
          <p className={labelClass}>Lead type</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { value: "direct", label: "Direct customer", hint: "Individual buyer or household." },
              { value: "business", label: "Business lead", hint: "Company, partner, or B2B account." },
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
                      ? "border-cyan-200/50 bg-[linear-gradient(135deg,rgba(59,130,246,0.34),rgba(139,92,246,0.28))] text-white shadow-[0_18px_34px_rgba(59,130,246,0.18)]"
                      : "border-white/10 bg-white/[0.045] text-white/72 hover:border-white/20 hover:bg-white/[0.07]",
                  ].join(" ")}
                  aria-pressed={selected}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-white/54">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </section>
        <ProfileInput label="First name" value={firstName} onChange={setFirstName} placeholder="Ada" />
        <ProfileInput label="Last name" value={lastName} onChange={setLastName} placeholder="Okafor" />
        <ProfileInput label="Email" type="email" value={email} onChange={setEmail} placeholder="lead@example.com" />
        <ProfileInput label="WhatsApp" value={whatsappNumber} onChange={setWhatsappNumber} placeholder="+234 801 234 5678" />
        <ProfileInput label="Previous region" value={state} onChange={setState} placeholder="Lagos" />
        <ProfileInput label="Country" value={country} onChange={setCountry} placeholder="Nigeria" />
        <ProfileInput label="Company" value={companyName} onChange={setCompanyName} placeholder="Northwind Ventures" />
        <ProfileInput label="State/Province/Region" value={region} onChange={setRegion} placeholder="Lagos State" />
        <ProfileInput label="City" value={city} onChange={setCity} placeholder="Lekki" />
        <ProfileInput label="Postal code" value={postalCode} onChange={setPostalCode} placeholder="101245" />
        <ProfileInput label="Address" value={address} onChange={setAddress} placeholder="14 Admiralty Way" className="sm:col-span-2" />
      </div>

      <section className={panelClass}>
        <p className={labelClass}>Sales details</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileInput label="Next follow-up" type="datetime-local" value={nextFollowUpAt} onChange={setNextFollowUpAt} />
          <ProfileInput label="Estimated value" type="number" value={estimatedValue} onChange={setEstimatedValue} />
          <ProfileInput label="Close probability" type="number" value={closeProbability} onChange={setCloseProbability} />
          <ProfileInput label="Expected close" type="datetime-local" value={expectedCloseDate} onChange={setExpectedCloseDate} />
          <ProfileInput label="Won value" type="number" value={wonValue} onChange={setWonValue} />
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Lost reason</span>
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
        <section className={panelClass}>
          <p className={labelClass}>Extra lead details</p>
          <CustomFieldValueInputs
            fields={customFieldInputModel}
            values={customFieldValues}
            onChange={(fieldId, value) =>
              setCustomFieldValues((current) => ({ ...current, [fieldId]: value }))
            }
          />
        </section>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void saveLeadProfile()}
          className="admin-button-primary h-12 w-full rounded-2xl px-5 text-sm"
        >
          {isSaving ? "Saving..." : "Save profile"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-white/68">{message}</p> : null}
    </div>
  );
}
