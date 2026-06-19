"use client";

import type { ChangeEvent } from "react";
import type { CustomFieldInputModel } from "@/lib/crm/custom-field-values";
import { AdminSelect } from "./AdminSelect";

function isWideField(type: CustomFieldInputModel["type"]) {
  return type === "textarea" || type === "multi_select";
}

function fieldInputType(type: CustomFieldInputModel["type"]) {
  switch (type) {
    case "email":
      return "email";
    case "phone":
      return "tel";
    case "url":
    case "file_url":
      return "url";
    case "date":
      return "date";
    case "datetime":
      return "datetime-local";
    case "number":
    case "currency":
      return "number";
    default:
      return "text";
  }
}

export function CustomFieldValueInputs({
  fields,
  values,
  onChange,
}: {
  fields: CustomFieldInputModel[];
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
}) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => {
        const value = values[field.fieldId] ?? field.value;
        const helpText = field.description || null;

        if (field.type === "textarea") {
          return (
            <label key={field.fieldId} className="space-y-2 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {field.label}
              </span>
              <textarea
                value={typeof value === "string" ? value : ""}
                onChange={(event) => onChange(field.fieldId, event.target.value)}
                rows={4}
                placeholder={field.placeholder ?? ""}
                className="admin-textarea min-h-[120px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
              />
              {helpText ? <p className="text-xs text-slate-500">{helpText}</p> : null}
            </label>
          );
        }

        if (field.type === "select") {
          return (
            <label key={field.fieldId} className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {field.label}
              </span>
              <AdminSelect
                value={typeof value === "string" ? value : ""}
                onChange={(event) => onChange(field.fieldId, event.target.value)}
                className="h-11"
              >
                <option value="">{field.required ? "Select an option" : "Not set yet"}</option>
                {field.options.map((option) => (
                  <option key={option.id} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AdminSelect>
              {helpText ? <p className="text-xs text-slate-500">{helpText}</p> : null}
            </label>
          );
        }

        if (field.type === "multi_select") {
          return (
            <label key={field.fieldId} className="space-y-2 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {field.label}
              </span>
              <select
                multiple
                value={Array.isArray(value) ? value.map((item) => String(item)) : []}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onChange(
                    field.fieldId,
                    Array.from(event.target.selectedOptions).map((option) => option.value),
                  )
                }
                className="admin-input min-h-[136px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
              >
                {field.options.map((option) => (
                  <option key={option.id} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {helpText ? <p className="text-xs text-slate-500">{helpText}</p> : null}
            </label>
          );
        }

        if (field.type === "checkbox") {
          return (
            <label
              key={field.fieldId}
              className="flex items-start gap-3 rounded-2xl border border-slate-200/85 bg-white/80 px-4 py-3"
            >
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(event) => onChange(field.fieldId, event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1d347f]"
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium text-slate-900">{field.label}</span>
                {helpText ? <span className="block text-xs text-slate-500">{helpText}</span> : null}
              </span>
            </label>
          );
        }

        return (
          <label
            key={field.fieldId}
            className={isWideField(field.type) ? "space-y-2 sm:col-span-2" : "space-y-2"}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {field.label}
            </span>
            <input
              type={fieldInputType(field.type)}
              step={field.type === "number" || field.type === "currency" ? "any" : undefined}
              value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
              onChange={(event) => onChange(field.fieldId, event.target.value)}
              placeholder={field.placeholder ?? ""}
              className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
            />
            {helpText ? <p className="text-xs text-slate-500">{helpText}</p> : null}
          </label>
        );
      })}
    </div>
  );
}
