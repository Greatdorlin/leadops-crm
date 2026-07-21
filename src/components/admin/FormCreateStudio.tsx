"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FilePlus2,
  Layers3,
} from "lucide-react";
import { AnimatedCard } from "@/components/admin/ui/AnimatedCard";
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { AdminDisclosure } from "@/components/admin/AdminDisclosure";
import { appRoutes } from "@/lib/app-routes";
import { cn } from "@/lib/cn";
import {
  FORM_TEMPLATES,
  getFormTemplateByKey,
  slugifyFormName,
  type FormTemplateDefinition,
} from "@/lib/crm/form-templates";

type CreateDraft = {
  templateKey: string;
  name: string;
  slug: string;
  isPublic: boolean;
};

const STEPS = [
  { number: 1, label: "Template" },
  { number: 2, label: "Details" },
] as const;

function buildDraft(template: FormTemplateDefinition): CreateDraft {
  return {
    templateKey: template.key,
    name: template.suggestedName,
    slug: template.suggestedSlug,
    isPublic: true,
  };
}

export function FormCreateStudio() {
  const router = useRouter();
  const [draft, setDraft] = useState<CreateDraft>(() =>
    buildDraft(getFormTemplateByKey("sales_inquiry")),
  );
  const [step, setStep] = useState(1);
  const [slugTouched, setSlugTouched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => getFormTemplateByKey(draft.templateKey),
    [draft.templateKey],
  );

  function applyTemplate(template: FormTemplateDefinition) {
    setDraft(buildDraft(template));
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

  function goToStep(nextStep: number) {
    setError(null);
    setStep(nextStep);
  }

  async function createForm() {
    const trimmedName = draft.name.trim();
    const trimmedSlug = slugifyFormName(draft.slug);

    if (!trimmedName || !trimmedSlug) {
      setError("Add a form name before creating the form.");
      setStep(2);
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
          description: selectedTemplate.description,
          isPublic: draft.isPublic,
          successMessage: selectedTemplate.successMessage,
          defaultStatus: selectedTemplate.defaultStatus,
          defaultPriority: selectedTemplate.defaultPriority,
          defaultSource: selectedTemplate.defaultSource,
          defaultOwnerId: null,
          fields: selectedTemplate.fields.map((field, index) => ({
            ...field,
            order: index,
            isRequired: field.isRequired === true,
            isVisible: true,
            placeholder: field.placeholder ?? null,
            helpText: field.helpText ?? null,
            mapsToLeadField: field.mapsToLeadField ?? null,
            options: field.options ?? null,
            validationRules: null,
            showWhen: null,
            defaultValue: field.defaultValue ?? null,
          })),
        }),
      });

      const createPayload = (await createResponse.json().catch(() => null)) as
        | { error?: string; form?: { id: string } }
        | null;

      if (!createResponse.ok || !createPayload?.form?.id) {
        throw new Error(createPayload?.error ?? "We couldn't create this form right now.");
      }

      router.push(`${appRoutes.form(createPayload.form.id)}/fields`);
      router.refresh();
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
    <div className="space-y-5 pb-24 sm:pb-0">
      <nav aria-label="Form creation progress" className="flex items-center gap-2">
        {STEPS.map((item, index) => (
          <div key={item.number} className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => item.number < step && goToStep(item.number)}
              disabled={item.number > step}
              className={cn(
                "flex min-w-0 items-center gap-2 text-left text-sm font-semibold transition",
                item.number <= step ? "text-white" : "text-white/35",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs",
                  item.number < step
                    ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                    : item.number === step
                      ? "border-[var(--ld-color-accent)]/40 bg-[var(--ld-color-accent)]/15 text-white"
                      : "border-white/10 bg-white/[0.03]",
                )}
              >
                {item.number < step ? <Check className="h-3.5 w-3.5" /> : item.number}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
            {index < STEPS.length - 1 ? <span className="h-px flex-1 bg-white/10" /> : null}
          </div>
        ))}
      </nav>

      <GlassSurface intensity="medium" className="grid min-w-0 overflow-hidden rounded-[28px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 p-5 sm:p-6">
          {step === 1 ? (
            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Step 1</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">Choose a template</h2>
                </div>
                <span className="text-xs font-medium text-white/45">{FORM_TEMPLATES.length} options</span>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {FORM_TEMPLATES.map((template, index) => {
                  const isActive = template.key === draft.templateKey;
                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="text-left"
                    >
                      <AnimatedCard
                        variant={isActive ? "elevated" : "subtle"}
                        animation="fadeInUp"
                        delay={index * 20}
                        className={cn(
                          "h-full rounded-[20px] p-4",
                          isActive
                            ? "border-[var(--ld-color-accent)]/35 bg-[var(--ld-color-accent)]/10"
                            : "hover:bg-white/[0.07]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{template.label}</p>
                            <p className="mt-1 line-clamp-1 text-xs text-white/52">{template.tagline}</p>
                          </div>
                          {isActive ? (
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ld-color-accent)]/18 text-[var(--ld-color-accent)]">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                        </div>
                      </AnimatedCard>
                    </button>
                  );
                })}
              </div>

              <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 xl:hidden">
                <summary className="cursor-pointer list-none text-sm font-semibold text-white/82">
                  Preview {selectedTemplate.fields.length} questions
                </summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {selectedTemplate.fields.length > 0 ? selectedTemplate.fields.map((field, index) => (
                    <div key={`${selectedTemplate.key}-mobile-${field.label}-${index}`} className="min-w-0 rounded-xl border border-white/8 bg-black/10 px-3 py-2">
                      <p className="truncate text-xs font-semibold text-white/74">{field.label}{field.isRequired ? " *" : ""}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-white/48">Start empty and add questions next.</p>
                  )}
                </div>
              </details>
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Step 2</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">Name your form</h2>
              <div className="mt-6 grid max-w-xl gap-5">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-white/80">Form name</span>
                  <input
                    autoFocus
                    type="text"
                    value={draft.name}
                    onChange={(event) => updateName(event.target.value)}
                    className="admin-input h-12 w-full rounded-2xl px-4 text-base outline-none"
                  />
                </label>
                <AdminDisclosure label="Edit public link" optional>
                  <label className="mt-2 block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Public link</span>
                    <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/10 px-4 focus-within:border-white/20">
                      <span className="shrink-0 text-sm text-white/38">/forms/</span>
                      <input
                        type="text"
                        value={draft.slug}
                        onChange={(event) => updateSlug(event.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
                      />
                    </div>
                  </label>
                </AdminDisclosure>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span>
                    <span className="block text-sm font-semibold text-white/82">Publish after creation</span>
                    <span className="mt-0.5 block text-xs text-white/45">You can change this later.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={draft.isPublic}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, isPublic: event.target.checked }))
                    }
                    className="admin-toggle"
                  />
                </label>
              </div>
            </section>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-300/22 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 flex flex-col-reverse gap-3 rounded-[22px] border border-white/14 bg-[color:color-mix(in_srgb,var(--ld-color-background)_86%,transparent)] p-3 shadow-[0_18px_54px_rgba(0,0,0,0.46)] backdrop-blur-2xl sm:static sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:rounded-none sm:border-x-0 sm:border-b-0 sm:border-t sm:border-white/10 sm:bg-transparent sm:p-0 sm:pt-5 sm:shadow-none sm:backdrop-blur-none">
            {step === 1 ? (
              <Link href={appRoutes.forms} className="text-center text-sm font-semibold text-white/58 hover:text-white">
                Cancel
              </Link>
            ) : (
              <SmoothButton variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => goToStep(step - 1)}>
                Back
              </SmoothButton>
            )}
            {step < 2 ? (
              <SmoothButton variant="primary" icon={<ArrowRight className="h-4 w-4" />} onClick={() => goToStep(step + 1)}>
                Continue
              </SmoothButton>
            ) : (
              <SmoothButton
                variant="primary"
                size="lg"
                icon={<FilePlus2 className="h-4 w-4" />}
                loading={isCreating}
                onClick={() => void createForm()}
              >
                {isCreating ? "Creating..." : "Create and build"}
              </SmoothButton>
            )}
          </div>
        </div>

        <aside className="hidden min-w-0 border-t border-white/10 bg-black/10 p-5 sm:p-6 xl:block xl:border-l xl:border-t-0">
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-[var(--ld-color-accent)]" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/48">Preview</p>
              <h2 className="truncate text-base font-semibold text-white">{draft.name || "Untitled form"}</h2>
            </div>
          </div>
          <p className="mt-2 text-xs text-white/45">{selectedTemplate.tagline}</p>

          <div className="mt-5 grid gap-3">
            {selectedTemplate.fields.length > 0 ? (
              selectedTemplate.fields.slice(0, 5).map((field, index) => (
                <div key={`${selectedTemplate.key}-${field.label}-${index}`} className="grid gap-1.5">
                  <span className="text-xs font-semibold text-white/76">
                    {field.label}{field.isRequired ? " *" : ""}
                  </span>
                  <div className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/32">
                    {field.placeholder ?? (field.fieldType === "select" ? "Choose an option" : "Type your answer")}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/12 bg-black/10 px-4 py-5 text-sm text-white/48">
                Add your first field after creation.
              </div>
            )}
            {selectedTemplate.fields.length > 5 ? (
              <p className="text-center text-xs text-white/38">+{selectedTemplate.fields.length - 5} more fields</p>
            ) : null}
          </div>

          <button type="button" disabled className="admin-button-primary mt-5 h-10 w-full rounded-xl text-sm opacity-70">
            Submit
          </button>
        </aside>
      </GlassSurface>
    </div>
  );
}
