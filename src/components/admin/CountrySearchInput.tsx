"use client";

import { Check, ChevronDown, MapPin, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { COUNTRY_NAMES } from "@/lib/countries";
import { cn } from "@/lib/cn";
import { AdminPickerHeader, AdminPickerScrollArea } from "./AdminPickerPanel";
import { ResponsivePopover } from "./ResponsivePopover";

const GLOBAL_CITY_SUGGESTIONS = [
  "Abidjan", "Abuja", "Accra", "Addis Ababa", "Amsterdam", "Atlanta", "Auckland",
  "Barcelona", "Beijing", "Berlin", "Birmingham", "Boston", "Brussels", "Buenos Aires",
  "Cairo", "Cape Town", "Casablanca", "Chicago", "Copenhagen", "Dakar", "Dallas", "Delhi",
  "Doha", "Dubai", "Dublin", "Edinburgh", "Frankfurt", "Geneva", "Guangzhou", "Hong Kong",
  "Houston", "Istanbul", "Johannesburg", "Kampala", "Kigali", "Lagos", "Lisbon", "London",
  "Los Angeles", "Madrid", "Melbourne", "Mexico City", "Miami", "Milan", "Montreal", "Mumbai",
  "Nairobi", "New York", "Oslo", "Ottawa", "Paris", "Port Harcourt", "Prague", "Riyadh",
  "Rome", "San Francisco", "Sao Paulo", "Seattle", "Seoul", "Shanghai", "Singapore", "Stockholm",
  "Sydney", "Tokyo", "Toronto", "Vancouver", "Vienna", "Warsaw", "Washington", "Zurich",
] as const;

export type LocationFieldExamples = {
  country: string;
  postalCode: string;
  region: string;
};

const LOCATION_FIELD_EXAMPLES: Record<string, LocationFieldExamples> = {
  Nigeria: { country: "Nigeria", region: "Lagos or FCT", postalCode: "100001" },
  Ghana: { country: "Ghana", region: "Greater Accra", postalCode: "GA-184-9084" },
  "United Kingdom": { country: "United Kingdom", region: "England", postalCode: "SW1A 1AA" },
  "United States": { country: "United States", region: "New York", postalCode: "10001" },
};

export function getLocationFieldExamples(country?: string | null): LocationFieldExamples {
  return LOCATION_FIELD_EXAMPLES[country?.trim() ?? ""] ?? {
    country: "Select country",
    region: "Region, province, or county",
    postalCode: "Postal code",
  };
}

function SearchableLocationInput({
  allowCustom,
  className,
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  allowCustom: boolean;
  className?: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  value: string;
}) {
  const listboxId = useId();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return options.slice(0, 40);
    return options.filter((option) => option.toLocaleLowerCase().includes(normalized)).slice(0, 60);
  }, [options, query]);

  const customValue = query.trim();
  const canUseCustom = allowCustom && customValue.length > 1 && !options.some(
    (option) => option.toLocaleLowerCase() === customValue.toLocaleLowerCase(),
  );

  function select(nextValue: string) {
    onChange(nextValue);
    setQuery("");
    setOpen(false);
    window.requestAnimationFrame(() => anchorRef.current?.focus({ preventScroll: true }));
  }

  function focusListOption(event: KeyboardEvent<HTMLElement>, direction: "first" | "next" | "previous") {
    const listbox = document.getElementById(listboxId);
    const optionButtons = Array.from(
      listbox?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? [],
    );
    if (optionButtons.length === 0) return;
    event.preventDefault();
    if (direction === "first") {
      optionButtons[0]?.focus({ preventScroll: true });
      return;
    }
    const currentIndex = optionButtons.indexOf(event.currentTarget as HTMLButtonElement);
    const nextIndex = direction === "next"
      ? Math.min(currentIndex + 1, optionButtons.length - 1)
      : Math.max(currentIndex - 1, 0);
    optionButtons[nextIndex]?.focus({ preventScroll: true });
  }

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{label}</span>
      <button
        ref={anchorRef}
        type="button"
        data-location-trigger="true"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`${label}. ${value || placeholder}`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="admin-input ld-focus-ring group flex h-12 w-full min-w-0 items-center gap-2 rounded-2xl py-0 pl-3 pr-1.5 text-left text-sm outline-none"
      >
        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-white/45" />
        <span className={cn("min-w-0 flex-1 truncate", value ? "text-white" : "text-white/45")}>
          {value || placeholder}
        </span>
        <span
          aria-hidden="true"
          data-location-trigger-affordance="true"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border border-white/10 bg-white/[0.08] text-white/60 transition group-hover:border-white/18 group-hover:bg-white/[0.12] group-hover:text-white/80"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      <ResponsivePopover
        anchorRef={anchorRef}
        ariaLabel={`Select ${label.toLocaleLowerCase()}`}
        open={open}
        onClose={() => setOpen(false)}
        desktopWidth={360}
      >
        <div className="flex min-h-0 flex-col">
          <AdminPickerHeader
            title={`Select ${label.toLocaleLowerCase()}`}
            description={allowCustom ? "Search the list or use a clear custom value." : "Search the available options."}
            onClose={() => setOpen(false)}
          />
          <div className="relative m-1.5">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") focusListOption(event, "first");
              }}
              placeholder={`Search ${label.toLocaleLowerCase()}`}
              data-popover-autofocus="true"
              className="admin-input ld-focus-ring h-11 w-full rounded-2xl pl-10 pr-4 text-sm outline-none"
            />
          </div>
          <AdminPickerScrollArea id={listboxId} role="listbox" className="p-1.5">
            {canUseCustom ? (
              <button type="button" role="option" aria-selected="false" onClick={() => select(customValue)} onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  select(customValue);
                  return;
                }
                if (event.key === "ArrowDown") focusListOption(event, "next");
                if (event.key === "ArrowUp") focusListOption(event, "previous");
              }} className="ld-focus-ring mb-1 flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-cyan-200/12 bg-cyan-300/[0.07] px-3 py-2.5 text-left text-sm font-semibold text-cyan-50 hover:bg-cyan-300/[0.12]">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">Use “{customValue}”</span>
              </button>
            ) : null}
            {filteredOptions.map((option) => (
              <button key={option} type="button" role="option" aria-selected={option === value} onClick={() => select(option)} onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  select(option);
                  return;
                }
                if (event.key === "ArrowDown") focusListOption(event, "next");
                if (event.key === "ArrowUp") focusListOption(event, "previous");
                if (event.key === "Home") focusListOption(event, "first");
              }} className="ld-focus-ring flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-white/78 transition hover:bg-white/[0.08] hover:text-white">
                <span className="min-w-0 flex-1 truncate">{option}</span>
                {option === value ? <Check className="h-4 w-4 shrink-0 text-cyan-200" /> : null}
              </button>
            ))}
            {filteredOptions.length === 0 && !canUseCustom ? (
              <p className="px-3 py-6 text-center text-sm text-white/55">No matching {label.toLocaleLowerCase()}.</p>
            ) : null}
          </AdminPickerScrollArea>
        </div>
      </ResponsivePopover>
    </div>
  );
}

export function CountrySearchInput(props: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <SearchableLocationInput
      {...props}
      label={props.label ?? "Country"}
      options={COUNTRY_NAMES}
      placeholder={props.placeholder ?? "Select country"}
      allowCustom={false}
    />
  );
}

export function CitySearchInput(props: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <SearchableLocationInput
      {...props}
      label={props.label ?? "City"}
      options={GLOBAL_CITY_SUGGESTIONS}
      placeholder={props.placeholder ?? "Select or search city"}
      allowCustom
    />
  );
}
