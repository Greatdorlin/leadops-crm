"use client";

import { startTransition, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import {
  buildCustomFieldInputModel,
  type CustomFieldDefinitionWithOptions,
} from "@/lib/crm/custom-field-values";
import type { LeadCustomerType } from "@/lib/crm/types";
import { AdminSelect } from "./AdminSelect";
import { CustomFieldValueInputs } from "./CustomFieldValueInputs";
import {
  CitySearchInput,
  CountrySearchInput,
  getLocationFieldExamples,
} from "./CountrySearchInput";
import { SmoothButton } from "./ui/SmoothButton";
import { getPhoneCountryProfile, isValidInternationalPhone } from "@/lib/crm/phone-country";

type ProfileInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

type LeadProfileFormProps = {
  leadId: string;
  initialFirstName: string;
  initialLastName: string;
  initialEmail: string;
  initialWhatsappNumber: string;
  initialCallNumber: string;
  initialCountry?: string | null;
  initialRegion?: string | null;
  initialCity?: string | null;
  initialAddress?: string | null;
  initialPostalCode?: string | null;
  initialCompanyName?: string | null;
  initialLeadCustomerType?: LeadCustomerType | null;
  initialSourceId?: string | null;
  initialSourceDetail?: string | null;
  initialCampaignLabel?: string | null;
  initialUtmSource?: string | null;
  initialUtmMedium?: string | null;
  initialUtmCampaign?: string | null;
  initialUtmContent?: string | null;
  initialUtmTerm?: string | null;
  initialLandingPage?: string | null;
  workspaceDefaultCountry?: string | null;
  workspaceDefaultCity?: string | null;
  workspaceDefaultRegion?: string | null;
  sourceOptions: Array<{ value: string; label: string }>;
  customFieldDefinitions?: CustomFieldDefinitionWithOptions[];
  initialCustomFieldValues?: Array<{ customFieldId: string; value: unknown }>;
};

const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-white/70";
const panelClass =
  "mt-4 space-y-3 rounded-[24px] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

function ProfileInput({ label, value, onChange, placeholder, type = "text", className, icon: Icon }: ProfileInputProps) {
  return (
    <label className={["space-y-2", className].filter(Boolean).join(" ")}>
      <span className={labelClass}>{label}</span>
      <span className="relative block">
        {Icon ? <Icon aria-hidden={true} className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" /> : null}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={["admin-input ld-focus-ring h-11 w-full rounded-2xl pr-4 text-sm outline-none", Icon ? "pl-10" : "px-4"].join(" ")}
        />
      </span>
    </label>
  );
}

export function LeadProfileForm({
  leadId,
  initialFirstName,
  initialLastName,
  initialEmail,
  initialWhatsappNumber,
  initialCallNumber,
  initialCountry,
  initialRegion,
  initialCity,
  initialAddress,
  initialPostalCode,
  initialCompanyName,
  initialLeadCustomerType,
  initialSourceId,
  initialSourceDetail,
  initialCampaignLabel,
  initialUtmSource,
  initialUtmMedium,
  initialUtmCampaign,
  initialUtmContent,
  initialUtmTerm,
  initialLandingPage,
  workspaceDefaultCountry,
  workspaceDefaultCity,
  workspaceDefaultRegion,
  sourceOptions,
  customFieldDefinitions = [],
  initialCustomFieldValues = [],
}: LeadProfileFormProps) {
  const customFieldInputModel = buildCustomFieldInputModel(
    customFieldDefinitions.filter((field) => field.showInForm),
    initialCustomFieldValues,
  );
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsappNumber);
  const [callNumber, setCallNumber] = useState(initialCallNumber);
  const [country, setCountry] = useState(initialCountry ?? "");
  const [region, setRegion] = useState(initialRegion ?? "");
  const [city, setCity] = useState(initialCity ?? "");
  const [address, setAddress] = useState(initialAddress ?? "");
  const [postalCode, setPostalCode] = useState(initialPostalCode ?? "");
  const [companyName, setCompanyName] = useState(initialCompanyName ?? "");
  const [leadCustomerType, setLeadCustomerType] = useState<LeadCustomerType>(
    initialLeadCustomerType ?? "direct",
  );
  const [sourceId, setSourceId] = useState(initialSourceId ?? "");
  const [sourceDetail, setSourceDetail] = useState(initialSourceDetail ?? "");
  const [campaignLabel, setCampaignLabel] = useState(initialCampaignLabel ?? "");
  const [utmSource, setUtmSource] = useState(initialUtmSource ?? "");
  const [utmMedium, setUtmMedium] = useState(initialUtmMedium ?? "");
  const [utmCampaign, setUtmCampaign] = useState(initialUtmCampaign ?? "");
  const [utmContent, setUtmContent] = useState(initialUtmContent ?? "");
  const [utmTerm, setUtmTerm] = useState(initialUtmTerm ?? "");
  const [landingPage, setLandingPage] = useState(initialLandingPage ?? "");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(customFieldInputModel.map((field) => [field.fieldId, field.value])),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const locationExamples = getLocationFieldExamples(country || workspaceDefaultCountry);
  const phoneProfile = getPhoneCountryProfile(country || workspaceDefaultCountry);

  async function saveLeadProfile() {
    if (!firstName.trim()) {
      setMessage("Add the lead's first name before saving.");
      return;
    }
    if (!email.trim() && !whatsappNumber.trim() && !callNumber.trim()) {
      setMessage("Add an email, WhatsApp number, or call number before saving.");
      return;
    }
    if (!isValidInternationalPhone(whatsappNumber) || !isValidInternationalPhone(callNumber)) {
      setMessage("Check the phone number and include a valid country code.");
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
          callNumber: callNumber.trim() || null,
          country: country.trim() || null,
          region: region.trim() || null,
          city: city.trim() || null,
          address: address.trim() || null,
          postalCode: postalCode.trim() || null,
          companyName: companyName.trim() || null,
          leadCustomerType,
          sourceId: sourceId || null,
          sourceDetail: sourceDetail.trim() || null,
          campaignLabel: campaignLabel.trim() || null,
          utmSource: utmSource.trim() || null,
          utmMedium: utmMedium.trim() || null,
          utmCampaign: utmCampaign.trim() || null,
          utmContent: utmContent.trim() || null,
          utmTerm: utmTerm.trim() || null,
          landingPage: landingPage.trim() || null,
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
    <div>
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
                      ? "border-white/20 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ld-color-primary)_34%,transparent),rgba(139,92,246,0.28))] text-white shadow-[0_18px_34px_color-mix(in_srgb,var(--ld-color-primary)_18%,transparent)]"
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
        <ProfileInput label="First name" value={firstName} onChange={setFirstName} placeholder="Ada" />
        <ProfileInput label="Last name" value={lastName} onChange={setLastName} placeholder="Okafor" />
        <ProfileInput label="Email" type="email" value={email} onChange={setEmail} placeholder="lead@example.com" />
        <ProfileInput label="WhatsApp number" type="tel" value={whatsappNumber} onChange={setWhatsappNumber} placeholder={phoneProfile.example} />
        <ProfileInput label="Call number" type="tel" value={callNumber} onChange={setCallNumber} placeholder={phoneProfile.example} />
        <CountrySearchInput value={country} onChange={setCountry} placeholder={locationExamples.country} />
        <ProfileInput label="Company" value={companyName} onChange={setCompanyName} placeholder="Northwind Ventures" />
        <ProfileInput label="Region" value={region} onChange={setRegion} placeholder={workspaceDefaultRegion || locationExamples.region} icon={MapPin} />
        <CitySearchInput value={city} onChange={setCity} placeholder={workspaceDefaultCity || "Select or search city"} />
        <ProfileInput label="Postal code" value={postalCode} onChange={setPostalCode} placeholder={locationExamples.postalCode} icon={MapPin} />
        <ProfileInput label="Address" value={address} onChange={setAddress} placeholder="Street address" icon={MapPin} className="sm:col-span-2" />
      </div>

      <section className={panelClass}>
        <p className={labelClass}>Source and campaign</p>
        <p className="text-sm leading-6 text-white/70">
          Keep business attribution clear. Connected-tool IDs and referral attribution remain read-only.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Source</span>
            <AdminSelect value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="h-11">
              <option value="">Not assigned</option>
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </AdminSelect>
          </label>
          <ProfileInput label="Source detail" value={sourceDetail} onChange={setSourceDetail} placeholder="Referral event or channel detail" />
          <ProfileInput label="Campaign name" value={campaignLabel} onChange={setCampaignLabel} placeholder="Q3 business campaign" />
          <ProfileInput label="UTM campaign" value={utmCampaign} onChange={setUtmCampaign} placeholder="q3_business" />
          <ProfileInput label="UTM source" value={utmSource} onChange={setUtmSource} placeholder="newsletter" />
          <ProfileInput label="UTM medium" value={utmMedium} onChange={setUtmMedium} placeholder="email" />
          <ProfileInput label="UTM content" value={utmContent} onChange={setUtmContent} placeholder="hero_cta" />
          <ProfileInput label="UTM term" value={utmTerm} onChange={setUtmTerm} placeholder="sales software" />
          <ProfileInput label="Landing page" value={landingPage} onChange={setLandingPage} placeholder="https://example.com/contact" className="sm:col-span-2" />
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
        <SmoothButton variant="primary" size="lg" onClick={() => void saveLeadProfile()} loading={isSaving} className="w-full">
          Save profile
        </SmoothButton>
      </div>
      {message ? <p className="mt-3 text-sm text-white/70">{message}</p> : null}
    </div>
  );
}
