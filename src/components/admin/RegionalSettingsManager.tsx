"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSelect } from "./AdminSelect";
import { CitySearchInput, CountrySearchInput } from "./CountrySearchInput";
import { SectionHeader } from "./SectionHeader";
import { SmoothButton } from "./ui/SmoothButton";
import {
  getTimeZoneOptions,
  getWorkspaceLocaleSuggestion,
} from "@/lib/workspace-locale";

export function RegionalSettingsManager({
  initialCountry,
  initialRegion,
  initialCity,
  initialTimeZone,
  initialLocale,
  demoMode = false,
}: {
  initialCountry: string;
  initialRegion: string;
  initialCity: string;
  initialTimeZone: string;
  initialLocale: string;
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [country, setCountry] = useState(initialCountry);
  const [region, setRegion] = useState(initialRegion);
  const [city, setCity] = useState(initialCity);
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [locale, setLocale] = useState(initialLocale);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  function chooseCountry(nextCountry: string) {
    const suggestion = getWorkspaceLocaleSuggestion(nextCountry);
    setCountry(nextCountry);
    setRegion(suggestion.region);
    setCity(suggestion.city);
    setTimeZone(suggestion.timeZone);
    setLocale(suggestion.locale);
  }

  async function save() {
    setIsSaving(true);
    setMessage("");
    if (demoMode) {
      setMessage("Regional defaults updated for this preview.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/settings/region", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, region, city, timeZone, locale }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "Regional settings could not be saved.");
        return;
      }
      setMessage("Regional defaults saved.");
      startTransition(() => router.refresh());
    } catch {
      setMessage("Regional settings could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Region"
        title="Workspace location and time"
        description="Defaults for new leads, dates, and number formatting."
        actions={
          <SmoothButton variant="primary" size="md" loading={isSaving} onClick={() => void save()}>
            Save region
          </SmoothButton>
        }
      />
      {message ? (
        <p className={message.includes("could not") ? "text-sm font-medium text-rose-200" : "text-sm font-medium text-emerald-200"}>
          {message}
        </p>
      ) : null}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <CountrySearchInput value={country} onChange={chooseCountry} />
        <CitySearchInput value={city} onChange={setCity} />
        <label className="min-w-0 space-y-2">
          <span className="admin-label">Region</span>
          <input
            className="admin-input ld-focus-ring h-12 w-full rounded-[18px] px-4 text-sm outline-none"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            placeholder="State, province, or region"
          />
        </label>
        <div className="min-w-0 space-y-2">
          <label htmlFor="regional-time-zone" className="admin-label">Time zone</label>
          <AdminSelect
            id="regional-time-zone"
            value={timeZone}
            onChange={(event) => setTimeZone(event.target.value)}
          >
            {getTimeZoneOptions().map((option) => (
              <option key={option} value={option}>{option.replaceAll("_", " ")}</option>
            ))}
          </AdminSelect>
        </div>
        <label className="min-w-0 space-y-2 sm:col-span-2">
          <span className="admin-label">Language and number format</span>
          <input
            className="admin-input ld-focus-ring h-12 w-full rounded-[18px] px-4 text-sm outline-none"
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            placeholder="en-NG"
          />
        </label>
      </div>
    </div>
  );
}
