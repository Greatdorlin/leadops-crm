"use client";

import { useCallback } from "react";
import { cn } from "@/lib/cn";

export type PublicFormFieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "select"
  | "checkbox"
  | "radio"
  | "textarea"
  | "date"
  | "file";

export interface PublicFormFieldOption {
  label: string;
  value: string;
}

export interface PublicFormFieldData {
  id: string;
  fieldType: PublicFormFieldType;
  label: string;
  placeholder?: string | null;
  helpText?: string | null;
  isRequired: boolean;
  order: number;
  options?: PublicFormFieldOption[] | null;
  validationRules?: Record<string, unknown> | null;
  showWhen?: Record<string, unknown> | null;
  defaultValue?: string | null;
}

export interface PublicFormFieldProps {
  field: PublicFormFieldData;
  value: unknown;
  onChange: (fieldId: string, value: unknown) => void;
  error?: string | null;
  disabled?: boolean;
}

function FieldLabel({
  field,
  htmlFor,
}: {
  field: PublicFormFieldData;
  htmlFor: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-semibold text-white/86"
    >
      {field.label}
      {field.isRequired ? (
        <span className="ml-1 text-rose-300" aria-hidden="true">
          *
        </span>
      ) : null}
      {field.isRequired ? (
        <span className="sr-only"> (required)</span>
      ) : null}
    </label>
  );
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-sm font-medium text-rose-200" role="alert">
      {message}
    </p>
  );
}

function FieldHelp({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <p className="mt-1.5 text-sm text-white/55">{text}</p>
  );
}

export function PublicFormField({
  field,
  value,
  onChange,
  error,
  disabled = false,
}: PublicFormFieldProps) {
  const inputId = `field-${field.id}`;
  const hasError = Boolean(error);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      onChange(field.id, e.target.value);
    },
    [field.id, onChange]
  );

  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === "") {
        onChange(field.id, "");
        return;
      }
      const num = Number(raw);
      onChange(field.id, Number.isFinite(num) ? num : raw);
    },
    [field.id, onChange]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      onChange(field.id, file);
    },
    [field.id, onChange]
  );

  const handleCheckboxChange = useCallback(
    (optionValue: string, checked: boolean) => {
      const current = Array.isArray(value) ? value : [];
      const set = new Set(current.map(String));
      if (checked) {
        set.add(optionValue);
      } else {
        set.delete(optionValue);
      }
      onChange(field.id, Array.from(set));
    },
    [field.id, value, onChange]
  );

  const handleRadioChange = useCallback(
    (optionValue: string) => {
      onChange(field.id, optionValue);
    },
    [field.id, onChange]
  );

  const baseInputClass = cn(
    "w-full rounded-2xl border bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all duration-200 backdrop-blur-xl",
    "placeholder:text-white/38",
    "focus:ring-2 focus:ring-offset-0",
    hasError
      ? "border-rose-300/55 focus:border-rose-300 focus:ring-rose-300/20"
      : "border-white/12 focus:border-white/26 focus:ring-white/12"
  );

  const options = field.options ?? [];

  switch (field.fieldType) {
    case "email": {
      return (
        <div className="w-full">
          <FieldLabel field={field} htmlFor={inputId} />
          <input
            id={inputId}
            type="email"
            name={field.id}
            placeholder={field.placeholder ?? undefined}
            value={typeof value === "string" ? value : ""}
            onChange={handleTextChange}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            className={cn(baseInputClass, "h-12")}
          />
          <FieldHelp text={field.helpText} />
          <FieldError message={error} />
        </div>
      );
    }

    case "phone": {
      return (
        <div className="w-full">
          <FieldLabel field={field} htmlFor={inputId} />
          <input
            id={inputId}
            type="tel"
            name={field.id}
            placeholder={field.placeholder ?? undefined}
            value={typeof value === "string" ? value : ""}
            onChange={handleTextChange}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            className={cn(baseInputClass, "h-12")}
          />
          <FieldHelp text={field.helpText} />
          <FieldError message={error} />
        </div>
      );
    }

    case "number": {
      const rules = field.validationRules ?? {};
      const min = typeof rules.min === "number" ? rules.min : undefined;
      const max = typeof rules.max === "number" ? rules.max : undefined;
      return (
        <div className="w-full">
          <FieldLabel field={field} htmlFor={inputId} />
          <input
            id={inputId}
            type="number"
            name={field.id}
            placeholder={field.placeholder ?? undefined}
            value={typeof value === "number" ? value : typeof value === "string" ? value : ""}
            onChange={handleNumberChange}
            disabled={disabled}
            min={min}
            max={max}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            className={cn(baseInputClass, "h-12")}
          />
          <FieldHelp text={field.helpText} />
          <FieldError message={error} />
        </div>
      );
    }

    case "select": {
      return (
        <div className="w-full">
          <FieldLabel field={field} htmlFor={inputId} />
          <select
            id={inputId}
            name={field.id}
            value={typeof value === "string" ? value : ""}
            onChange={handleTextChange}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            className={cn(baseInputClass, "h-12 appearance-none pr-10")}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
            }}
          >
            <option value="">Select an option</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <FieldHelp text={field.helpText} />
          <FieldError message={error} />
        </div>
      );
    }

    case "checkbox": {
      const selectedValues = new Set(Array.isArray(value) ? value.map(String) : []);
      return (
        <div className="w-full">
          <FieldLabel field={field} htmlFor={inputId} />
          <div className="space-y-2.5">
            {options.map((opt) => {
              const optId = `${inputId}-${opt.value}`;
              const isChecked = selectedValues.has(opt.value);
              return (
                <label
                  key={opt.value}
                  htmlFor={optId}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-200",
                    isChecked
                      ? "border-white/24 bg-white/[0.1]"
                      : "border-white/10 bg-white/[0.04] hover:border-white/20"
                  )}
                >
                  <input
                    id={optId}
                    type="checkbox"
                    name={`${field.id}[]`}
                    value={opt.value}
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(opt.value, e.target.checked)}
                    disabled={disabled}
                    className="h-5 w-5 shrink-0 rounded-md border-white/20 text-white accent-[var(--form-accent)] focus:ring-2 focus:ring-white/20"
                  />
                  <span className="text-sm text-white/78">{opt.label}</span>
                </label>
              );
            })}
          </div>
          <FieldHelp text={field.helpText} />
          <FieldError message={error} />
        </div>
      );
    }

    case "radio": {
      return (
        <div className="w-full">
          <FieldLabel field={field} htmlFor={inputId} />
          <div className="space-y-2.5">
            {options.map((opt) => {
              const optId = `${inputId}-${opt.value}`;
              const isSelected = value === opt.value;
              return (
                <label
                  key={opt.value}
                  htmlFor={optId}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-200",
                    isSelected
                      ? "border-white/24 bg-white/[0.1]"
                      : "border-white/10 bg-white/[0.04] hover:border-white/20"
                  )}
                >
                  <input
                    id={optId}
                    type="radio"
                    name={field.id}
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => handleRadioChange(opt.value)}
                    disabled={disabled}
                    className="h-5 w-5 shrink-0 border-white/20 text-white accent-[var(--form-accent)] focus:ring-2 focus:ring-white/20"
                  />
                  <span className="text-sm text-white/78">{opt.label}</span>
                </label>
              );
            })}
          </div>
          <FieldHelp text={field.helpText} />
          <FieldError message={error} />
        </div>
      );
    }

    case "textarea": {
      return (
        <div className="w-full">
          <FieldLabel field={field} htmlFor={inputId} />
          <textarea
            id={inputId}
            name={field.id}
            placeholder={field.placeholder ?? undefined}
            value={typeof value === "string" ? value : ""}
            onChange={handleTextChange}
            disabled={disabled}
            rows={4}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            className={cn(baseInputClass, "min-h-[120px] resize-y")}
          />
          <FieldHelp text={field.helpText} />
          <FieldError message={error} />
        </div>
      );
    }

    case "date": {
      return (
        <div className="w-full">
          <FieldLabel field={field} htmlFor={inputId} />
          <input
            id={inputId}
            type="date"
            name={field.id}
            placeholder={field.placeholder ?? undefined}
            value={typeof value === "string" ? value : ""}
            onChange={handleTextChange}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            className={cn(baseInputClass, "h-12")}
          />
          <FieldHelp text={field.helpText} />
          <FieldError message={error} />
        </div>
      );
    }

    case "file": {
      return (
        <div className="w-full">
          <FieldLabel field={field} htmlFor={inputId} />
          <input
            id={inputId}
            type="file"
            name={field.id}
            onChange={handleFileChange}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            className={cn(
              "block w-full rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm text-white/72 outline-none transition-all duration-200 backdrop-blur-xl",
              "file:mr-4 file:rounded-xl file:border-0 file:bg-white/[0.08] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white",
              "hover:file:bg-white/[0.12]",
              hasError && "border-rose-300/55 focus:border-rose-300"
            )}
          />
          <FieldHelp text={field.helpText} />
          <FieldError message={error} />
        </div>
      );
    }

    case "text":
    default: {
      return (
        <div className="w-full">
          <FieldLabel field={field} htmlFor={inputId} />
          <input
            id={inputId}
            type="text"
            name={field.id}
            placeholder={field.placeholder ?? undefined}
            value={typeof value === "string" ? value : ""}
            onChange={handleTextChange}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            className={cn(baseInputClass, "h-12")}
          />
          <FieldHelp text={field.helpText} />
          <FieldError message={error} />
        </div>
      );
    }
  }
}
