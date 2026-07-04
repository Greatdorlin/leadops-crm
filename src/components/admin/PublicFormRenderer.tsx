"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { cn } from "@/lib/cn";
import { PublicFormField } from "./PublicFormField";
import type { PublicFormFieldData } from "./PublicFormField";

export interface PublicFormConfig {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  successMessage?: string | null;
  redirectUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
}

export interface PublicFormRendererProps {
  form: PublicFormConfig;
  fields: PublicFormFieldData[];
}

interface FormErrors {
  [fieldId: string]: string | null;
}

function evaluateShowWhen(
  showWhen: Record<string, unknown> | null | undefined,
  formValues: Record<string, unknown>
): boolean {
  if (!showWhen || Object.keys(showWhen).length === 0) {
    return true;
  }

  const fieldId = showWhen.fieldId as string | undefined;
  const operator = showWhen.operator as string | undefined;
  const expectedValue = showWhen.value as string | undefined;

  if (!fieldId || !operator) {
    return true;
  }

  const actualValue = formValues[fieldId];

  switch (operator) {
    case "equals":
      return String(actualValue) === (expectedValue ?? "");
    case "not_equals":
      return String(actualValue) !== (expectedValue ?? "");
    case "contains":
      return String(actualValue).includes(expectedValue ?? "");
    case "greater_than":
      return Number(actualValue) > Number(expectedValue);
    case "less_than":
      return Number(actualValue) < Number(expectedValue);
    case "checked":
      return Boolean(actualValue) === true;
    case "unchecked":
      return Boolean(actualValue) === false;
    case "empty":
      return actualValue === undefined || actualValue === null || actualValue === "";
    case "not_empty":
      return actualValue !== undefined && actualValue !== null && actualValue !== "";
    default:
      return true;
  }
}

function validateField(
  field: PublicFormFieldData,
  value: unknown
): string | null {
  if (field.isRequired) {
    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);
    if (isEmpty) {
      return `${field.label} is required.`;
    }
  }

  const rules = field.validationRules ?? {};
  const strValue = typeof value === "string" ? value : String(value ?? "");

  if (rules.pattern && typeof rules.pattern === "string" && strValue) {
    try {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(strValue)) {
        return typeof rules.patternMessage === "string"
          ? rules.patternMessage
          : `${field.label} is invalid.`;
      }
    } catch {
      // Invalid regex, skip
    }
  }

  if (typeof rules.minLength === "number" && strValue) {
    if (strValue.length < rules.minLength) {
      return `${field.label} must be at least ${rules.minLength} characters.`;
    }
  }

  if (typeof rules.maxLength === "number" && strValue) {
    if (strValue.length > rules.maxLength) {
      return `${field.label} must be at most ${rules.maxLength} characters.`;
    }
  }

  if (typeof rules.min === "number" && typeof value === "number") {
    if (value < rules.min) {
      return `${field.label} must be at least ${rules.min}.`;
    }
  }

  if (typeof rules.max === "number" && typeof value === "number") {
    if (value > rules.max) {
      return `${field.label} must be at most ${rules.max}.`;
    }
  }

  return null;
}

export function PublicFormRenderer({ form, fields }: PublicFormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    submissionId: string;
    leadId: string | null;
  } | null>(null);

  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.defaultValue !== undefined && field.defaultValue !== null) {
        defaults[field.id] = field.defaultValue;
      }
    }
    setValues((prev) => ({ ...defaults, ...prev }));
  }, [fields]);

  const handleChange = useCallback(
    (fieldId: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [fieldId]: value }));
      setTouched((prev) => new Set(prev).add(fieldId));
      setErrors((prev) => ({ ...prev, [fieldId]: null }));
      setSubmitError(null);
    },
    []
  );

  const visibleFields = useMemo(() => {
    return fields
      .filter((field) => evaluateShowWhen(field.showWhen, values))
      .sort((a, b) => a.order - b.order);
  }, [fields, values]);

  const validateAll = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    for (const field of visibleFields) {
      const error = validateField(field, values[field.id]);
      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [visibleFields, values]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);

      const allTouched = new Set(visibleFields.map((f) => f.id));
      setTouched(allTouched);

      if (!validateAll()) {
        return;
      }

      setSubmitting(true);

      try {
        const response = await fetch(`/api/forms/${form.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: values }),
        });

        const result = await response.json().catch(() => ({
          error: "Something went wrong. Please try again.",
        }));

        if (!response.ok) {
          setSubmitError(result.error ?? "Submission failed. Please try again.");
          return;
        }

        setSubmitSuccess(true);
        setSubmitResult({
          submissionId: result.submissionId as string,
          leadId: result.leadId as string | null,
        });

        if (form.redirectUrl) {
          setTimeout(() => {
            window.location.href = form.redirectUrl!;
          }, 2000);
        }
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Network error. Please try again."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [form.id, form.redirectUrl, values, validateAll, visibleFields]
  );

  const brandStyle = useMemo<React.CSSProperties>(() => {
    return {
      "--form-primary": form.primaryColor ?? "#0f172a",
      "--form-accent": form.accentColor ?? "#3b82f6",
    } as React.CSSProperties;
  }, [form.primaryColor, form.accentColor]);

  const primaryColor = form.primaryColor ?? "#0f172a";
  const accentColor = form.accentColor ?? "#3b82f6";

  if (submitSuccess) {
    return (
      <div
        className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-12"
        style={brandStyle}
      >
        <div className="text-center">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${accentColor}22, ${primaryColor}18)`,
              border: `1px solid ${accentColor}30`,
            }}
          >
            <svg
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke={accentColor}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2
            className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            style={{ fontFamily: "var(--font-heading-active), var(--font-fallback), sans-serif" }}
          >
            Thank you!
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            {form.successMessage ?? "Thank you for your submission."}
          </p>
          {form.redirectUrl ? (
            <p className="mt-2 text-sm text-slate-500">
              Redirecting you shortly...
            </p>
          ) : null}
          {submitResult?.leadId ? (
            <p className="mt-4 text-sm text-slate-500">
              Your reference: {submitResult.submissionId.slice(0, 8)}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-10"
      style={brandStyle}
    >
      <div className="mb-8">
        {form.logoUrl ? (
          <div className="mb-5">
            <img
              src={form.logoUrl}
              alt=""
              className="h-10 max-w-[180px] object-contain"
            />
          </div>
        ) : null}
        <h1
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          style={{ fontFamily: "var(--font-heading-active), var(--font-fallback), sans-serif" }}
        >
          {form.name}
        </h1>
        {form.description ? (
          <p className="mt-2 text-base leading-7 text-slate-600">{form.description}</p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {visibleFields.map((field) => (
          <PublicFormField
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={handleChange}
            error={touched.has(field.id) ? errors[field.id] ?? null : null}
            disabled={submitting}
          />
        ))}

        {submitError ? (
          <div
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
            role="alert"
          >
            {submitError}
          </div>
        ) : null}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "relative inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-sm font-semibold text-white shadow-lg transition-all duration-200 sm:h-14 sm:text-base",
              "hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
              "disabled:cursor-wait disabled:opacity-70 disabled:translate-y-0 disabled:shadow-none"
            )}
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
              boxShadow: `0 12px 32px ${primaryColor}33`,
            }}
          >
            {submitting ? (
              <>
                <span className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          Powered by{" "}
          <span className="font-semibold text-slate-500">Leads Desk</span>
        </p>
      </form>
    </div>
  );
}
