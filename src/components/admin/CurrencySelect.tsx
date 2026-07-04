"use client";

import type { ComponentPropsWithoutRef } from "react";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { AdminSelect } from "./AdminSelect";

export function CurrencySelect({
  value,
  onChange,
  className,
  label = "Currency",
  ...props
}: Omit<ComponentPropsWithoutRef<"select">, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{label}</span>
      <AdminSelect
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
        {...props}
      >
        {SUPPORTED_CURRENCIES.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.code} — {currency.name} ({currency.symbol})
          </option>
        ))}
      </AdminSelect>
    </label>
  );
}
