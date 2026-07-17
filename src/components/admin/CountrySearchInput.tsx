"use client";

import { useId } from "react";
import { COUNTRY_NAMES } from "@/lib/countries";

export function CountrySearchInput({
  value,
  onChange,
  label = "Country",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}) {
  const listId = useId();

  return (
    <label className={["space-y-2", className].filter(Boolean).join(" ")}>
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{label}</span>
      <input
        type="search"
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search countries"
        autoComplete="country-name"
        className="admin-input ld-focus-ring h-11 w-full rounded-2xl px-4 text-sm outline-none"
      />
      <datalist id={listId}>
        {COUNTRY_NAMES.map((country) => (
          <option key={country} value={country} />
        ))}
      </datalist>
    </label>
  );
}
