"use client";

import type { CSSProperties, FormEvent } from "react";
import { useState, useCallback, useMemo } from "react";
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
  previewMode?: boolean;
}

interface FormErrors {
  [fieldId: string]: string | null;
}

function buildDefaultFieldValues(fields: PublicFormFieldData[]) {
  return fields.reduce<Record<string, unknown>>((defaults, field) => {
    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      defaults[field.id] = field.defaultValue;
    }
    return defaults;
  }, {});
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

export function PublicFormRenderer({ form, fields, previewMode = false }: PublicFormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => buildDefaultFieldValues(fields));
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    submissionId: string;
    leadId: string | null;
  } | null>(null);

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
    async (e: FormEvent) => {
      e.preventDefault();
      setSubmitError(null);

      const allTouched = new Set(visibleFields.map((f) => f.id));
      setTouched(allTouched);

      if (!validateAll()) {
        return;
      }

      setSubmitting(true);

      try {
        if (previewMode) {
          setSubmitSuccess(true);
          setSubmitResult({ submissionId: "preview-submission", leadId: null });
          return;
        }

        const response = await fetch(`/api/forms/${form.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: values }),
        });

        const result = await response.json().catch(() => ({
          error: "Something went wrong. Please try again.",
        })) as {
          error?: string;
          fieldErrors?: Record<string, unknown>;
          submissionId?: string;
          leadId?: string | null;
        };

        if (!response.ok) {
          if (result.fieldErrors && typeof result.fieldErrors === "object") {
            const serverErrors = Object.fromEntries(
              Object.entries(result.fieldErrors).filter(
                (entry): entry is [string, string] => typeof entry[1] === "string",
              ),
            );
            setErrors(serverErrors);
            setTouched(new Set(Object.keys(serverErrors)));
          }
          setSubmitError(result.error ?? "Submission failed. Please try again.");
          return;
        }

        setSubmitSuccess(true);
        setSubmitResult({
          submissionId: result.submissionId ?? "",
          leadId: result.leadId ?? null,
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
    [form.id, form.redirectUrl, previewMode, values, validateAll, visibleFields]
  );

  const brandStyle = useMemo<CSSProperties>(() => {
    return {
      "--form-primary": form.primaryColor ?? "#0f172a",
      "--form-accent": form.accentColor ?? "#3b82f6",
    } as CSSProperties;
  }, [form.primaryColor, form.accentColor]);

  const primaryColor = form.primaryColor ?? "#0f172a";
  const accentColor = form.accentColor ?? "#3b82f6";

  if (submitSuccess) {
    return (
      <div
        className="mx-auto w-full max-w-3xl rounded-[32px] border border-white/14 bg-[#091120]/78 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.34)] backdrop-blur-[22px] sm:p-12"
        style={brandStyle}
      >
        <div className="text-center">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${accentColor}30, ${primaryColor}1f)`,
              border: `1px solid ${accentColor}45`,
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
            className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-heading-active), var(--font-fallback), sans-serif" }}
          >
            Thank you!
          </h2>
          <p className="mt-3 text-base leading-7 text-white/70">
            {form.successMessage ?? "Thank you for your submission."}
          </p>
          {form.redirectUrl ? (
            <p className="mt-2 text-sm text-white/52">
              Redirecting you shortly...
            </p>
          ) : null}
          {submitResult?.leadId ? (
            <p className="mt-4 text-sm text-white/52">
              Your reference: {submitResult.submissionId.slice(0, 8)}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-3xl overflow-hidden rounded-[22px] border border-white/14 bg-[#091120]/76 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.34)] backdrop-blur-[22px] sm:rounded-[32px] sm:p-8"
      style={brandStyle}
    >
      <div
        className="mb-5 rounded-[18px] border border-white/10 px-4 py-4 sm:mb-6 sm:rounded-[28px] sm:px-6 sm:py-5"
        style={{
          background: `linear-gradient(145deg, ${primaryColor}18, rgba(5,10,20,0.82) 58%, ${accentColor}18)`,
        }}
      >
        {form.logoUrl ? (
          <div className="flex items-center">
            <div className="flex h-12 max-w-[220px] items-center rounded-2xl border border-white/10 bg-white/[0.06] px-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.logoUrl}
                alt=""
                className="h-10 max-w-[180px] object-contain"
              />
            </div>
          </div>
        ) : null}
        <div className={form.logoUrl ? "mt-4 sm:mt-5" : undefined}>
          <h1
            className="text-[1.7rem] font-bold leading-tight tracking-[-0.04em] text-white sm:text-4xl"
            style={{ fontFamily: "var(--font-heading-active), var(--font-fallback), sans-serif" }}
          >
            {form.name}
          </h1>
          {form.description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/68 sm:text-base sm:leading-7">{form.description}</p>
          ) : (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62 sm:text-base sm:leading-7">
              Complete the form and we&apos;ll follow up.
            </p>
          )}
        </div>
      </div>

      <div className="p-1 sm:rounded-[28px] sm:border sm:border-white/10 sm:bg-black/12 sm:p-6 sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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
              className="rounded-2xl border border-rose-300/24 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100"
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
                "relative inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white shadow-lg transition-all duration-200 sm:h-14 sm:text-base",
                "hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
                "disabled:cursor-wait disabled:opacity-70 disabled:translate-y-0 disabled:shadow-none"
              )}
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                boxShadow: `0 16px 40px ${primaryColor}3b`,
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

        </form>
      </div>
    </div>
  );
}
