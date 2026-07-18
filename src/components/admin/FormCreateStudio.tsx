"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  FilePlus2,
  Layers3,
  Wand2,
} from "lucide-react";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AnimatedCard } from "@/components/admin/ui/AnimatedCard";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { appRoutes } from "@/lib/app-routes";
import { cn } from "@/lib/cn";
import {
  FORM_TEMPLATES,
  getFormTemplateByKey,
  slugifyFormName,
  type FormTemplateDefinition,
} from "@/lib/crm/form-templates";

type FormCreateStudioProps = {
  stageOptions: Array<{ value: string; label: string }>;
  sourceOptions: Array<{ value: string; label: string }>;
  ownerOptions: Array<{ value: string; label: string }>;
};

type CreateDraft = {
  templateKey: string;
  name: string;
  slug: string;
  description: string;
  defaultStatus: string;
  defaultPriority: string;
  defaultSource: string;
  defaultOwnerId: string;
  successMessage: string;
  isPublic: boolean;
};

function buildDraft(template: FormTemplateDefinition): CreateDraft {
  return {
    templateKey: template.key,
    name: template.suggestedName,
    slug: template.suggestedSlug,
    description: template.description,
    defaultStatus: template.defaultStatus,
    defaultPriority: template.defaultPriority,
    defaultSource: template.defaultSource,
    defaultOwnerId: "",
    successMessage: template.successMessage,
    isPublic: true,
  };
}

export function FormCreateStudio({
  stageOptions,
  sourceOptions,
  ownerOptions,
}: FormCreateStudioProps) {
  const [draft, setDraft] = useState<CreateDraft>(() =>
    buildDraft(getFormTemplateByKey("sales_inquiry")),
  );
  const [slugTouched, setSlugTouched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => getFormTemplateByKey(draft.templateKey),
    [draft.templateKey],
  );

  function applyTemplate(template: FormTemplateDefinition) {
    setDraft((current) => ({
      ...buildDraft(template),
      name: current.name.trim() && current.templateKey === template.key ? current.name : template.suggestedName,
      slug:
        current.templateKey === template.key && current.slug.trim()
          ? current.slug
          : template.suggestedSlug,
      defaultOwnerId: current.defaultOwnerId,
    }));
    setSlugTouched(false);
    setError(null);
  }

  function updateName(value: string) {
    setDraft((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : slugifyFormName(value),
    }));
  }

  function updateSlug(value: string) {
    setSlugTouched(true);
    setDraft((current) => ({ ...current, slug: slugifyFormName(value) }));
  }

  async function createForm() {
    const trimmedName = draft.name.trim();
    const trimmedSlug = slugifyFormName(draft.slug);

    if (!trimmedName || !trimmedSlug) {
      setError("Choose a form name and a valid slug before creating the form.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const createResponse = await fetch("/api/admin/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          slug: trimmedSlug,
          description: draft.description.trim() || null,
          isPublic: draft.isPublic,
          successMessage: draft.successMessage.trim() || selectedTemplate.successMessage,
          defaultStatus: draft.defaultStatus,
          defaultPriority: draft.defaultPriority,
          defaultSource: draft.defaultSource,
          defaultOwnerId: draft.defaultOwnerId || null,
        }),
      });

      const createPayload = (await createResponse.json().catch(() => null)) as
        | { error?: string; form?: { id: string } }
        | null;

      if (!createResponse.ok || !createPayload?.form?.id) {
        throw new Error(createPayload?.error ?? "We couldn't create this form right now.");
      }

      for (const [index, field] of selectedTemplate.fields.entries()) {
        const fieldResponse = await fetch(
          `/api/admin/forms/${createPayload.form.id}/fields`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...field,
              order: index,
              isRequired: field.isRequired === true,
              isVisible: true,
              placeholder: field.placeholder ?? null,
              helpText: field.helpText ?? null,
              mapsToLeadField: field.mapsToLeadField ?? null,
              options: field.options ?? null,
              defaultValue: field.defaultValue ?? null,
            }),
          },
        );

        if (!fieldResponse.ok) {
          const fieldPayload = (await fieldResponse.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(
            fieldPayload?.error ??
              "The form was created, but the starter fields did not finish saving.",
          );
        }
      }

      window.location.assign(appRoutes.form(createPayload.form.id));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "We couldn't create this form right now.",
      );
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Built-in forms"
        title="Create a form"
        description="Choose a starting point, name it, and preview it live."
        variant="large"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <section className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Template library
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">
                Choose a template
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/60">
              {FORM_TEMPLATES.length} options
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {FORM_TEMPLATES.map((template, index) => {
              const isActive = template.key === draft.templateKey;
              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className={cn(
                    "text-left transition",
                    isActive ? "scale-[1.01]" : "hover:-translate-y-0.5",
                  )}
                >
                  <AnimatedCard
                    variant={isActive ? "elevated" : "subtle"}
                    animation="fadeInUp"
                    delay={index * 25}
                    className={cn(
                      "h-full rounded-[24px] p-4",
                      isActive
                        ? "border-[var(--ld-color-accent)]/28 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--ld-color-primary)_16%,transparent),rgba(255,255,255,0.05),color-mix(in_srgb,var(--ld-color-accent)_14%,transparent))]"
                        : "",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{template.label}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                          {template.tagline}
                        </p>
                      </div>
                      {isActive ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ld-color-accent)]/18 text-[var(--ld-color-accent)]">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/58">
                        {template.fields.length} starter fields
                      </span>
                    </div>
                  </AnimatedCard>
                </button>
              );
            })}
          </div>
        </section>

        <div className="space-y-6">
          <GlassSurface intensity="medium" className="rounded-[28px] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-[var(--ld-color-accent)]" />
              <h2 className="text-base font-semibold text-white">Create form</h2>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Form name</span>
                <input type="text" value={draft.name} onChange={(event) => updateName(event.target.value)} className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none" />
              </label>
              <details className="group rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-white marker:hidden">
                  Advanced setup <span className="text-white/48 group-open:hidden">(optional)</span>
                </summary>
                <div className="mt-4 grid gap-4">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                  Slug
                </span>
                <input
                  type="text"
                  value={draft.slug}
                  onChange={(event) => updateSlug(event.target.value)}
                  className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                  One-line description
                </span>
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={3}
                  className="admin-textarea min-h-[112px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                    Default stage
                  </span>
                  <AdminSelect
                    value={draft.defaultStatus}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        defaultStatus: event.target.value,
                      }))
                    }
                    className="h-11"
                  >
                    {stageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </AdminSelect>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                    Default source
                  </span>
                  <AdminSelect
                    value={draft.defaultSource}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        defaultSource: event.target.value,
                      }))
                    }
                    className="h-11"
                  >
                    {sourceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </AdminSelect>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                    Default priority
                  </span>
                  <AdminSelect
                    value={draft.defaultPriority}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        defaultPriority: event.target.value,
                      }))
                    }
                    className="h-11"
                  >
                    {[
                      { value: "low", label: "Low" },
                      { value: "medium", label: "Medium" },
                      { value: "high", label: "High" },
                      { value: "urgent", label: "Urgent" },
                    ].map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </AdminSelect>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                    Default owner
                  </span>
                  <AdminSelect
                    value={draft.defaultOwnerId}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        defaultOwnerId: event.target.value,
                      }))
                    }
                    className="h-11"
                  >
                    <option value="">Unassigned</option>
                    {ownerOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </AdminSelect>
                </label>
              </div>

              <label className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-white/72">
                <span>Public form link ready after creation</span>
                <input
                  type="checkbox"
                  checked={draft.isPublic}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      isPublic: event.target.checked,
                    }))
                  }
                  className="admin-toggle"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                  Thank-you message
                </span>
                <textarea
                  value={draft.successMessage}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      successMessage: event.target.value,
                    }))
                  }
                  rows={2}
                  className="admin-textarea min-h-[92px] w-full rounded-2xl px-4 py-3 text-sm outline-none"
                />
              </label>
                </div>
              </details>

              {error ? (
                <div className="rounded-2xl border border-rose-300/22 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
                <SmoothButton
                  variant="primary"
                  size="lg"
                  icon={<FilePlus2 className="h-4 w-4" />}
                  loading={isCreating}
                  onClick={() => void createForm()}
                >
                  {isCreating ? "Creating form..." : "Create form"}
                </SmoothButton>
                <Link
                  href={appRoutes.forms}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Back to forms
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </GlassSurface>

          <GlassSurface intensity="soft" className="rounded-[28px] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-white/70" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Live preview</p>
                <h2 className="truncate text-base font-semibold text-white">{draft.name || "Untitled form"}</h2>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {selectedTemplate.fields.length > 0 ? (
                selectedTemplate.fields.map((field, index) => (
                  <label key={`${selectedTemplate.key}-${field.label}-${index}`} className="grid gap-2">
                    <span className="text-sm font-semibold text-white/84">{field.label}{field.isRequired ? " *" : ""}</span>
                    {field.fieldType === "textarea" ? (
                      <textarea disabled rows={3} placeholder={field.placeholder ?? "Type your answer"} className="admin-textarea w-full rounded-2xl px-4 py-3 text-sm opacity-90" />
                    ) : field.fieldType === "select" ? (
                      <select disabled className="admin-select h-11 w-full rounded-2xl px-4 text-sm opacity-90"><option>Choose an option</option></select>
                    ) : field.fieldType === "checkbox" ? (
                      <span className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70"><input type="checkbox" disabled /> Yes</span>
                    ) : (
                      <input disabled type={field.fieldType === "email" ? "email" : field.fieldType === "phone" ? "tel" : "text"} placeholder={field.placeholder ?? "Type your answer"} className="admin-input h-11 w-full rounded-2xl px-4 text-sm opacity-90" />
                    )}
                  </label>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-white/12 bg-black/10 px-4 py-5 text-sm text-white/58">
                  Blank forms start without fields so the team can build the intake from scratch.
                </div>
              )}
            </div>

            <button type="button" disabled className="admin-button-primary mt-5 h-11 w-full rounded-2xl text-sm">Submit</button>
          </GlassSurface>
        </div>
      </div>
    </div>
  );
}
