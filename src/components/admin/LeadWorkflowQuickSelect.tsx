"use client";

import { useId, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import {
  partitionPipelineStageOptions,
  PRODUCT_QUALIFICATION_ACTION,
} from "@/lib/crm/pipeline-stage-options";
import { isUnqualifiedStage } from "@/lib/crm/qualification-stage";
import { useRouter } from "next/navigation";
import { LeadQualificationDialog } from "./LeadQualificationDialog";
import { cn } from "@/lib/cn";
import { AdminPickerHeader, AdminPickerScrollArea } from "./AdminPickerPanel";
import { ResponsivePopover } from "./ResponsivePopover";

export interface LeadWorkflowQuickOption {
  value: string;
  label: string;
  color?: string | null;
  key?: string;
}

export function LeadWorkflowQuickSelect({
  leadId,
  field,
  initialValue,
  initialLabel,
  initialColor,
  options,
  pickerTitle,
  pickerDescription,
  testId,
  previewMode = false,
}: {
  leadId: string;
  field: "stageId" | "priority";
  initialValue: string;
  initialLabel: string;
  initialColor?: string | null;
  options: LeadWorkflowQuickOption[];
  pickerTitle: string;
  pickerDescription: string;
  testId: string;
  previewMode?: boolean;
}) {
  const router = useRouter();
  const [showMoreStages, setShowMoreStages] = useState(false);
  const choices =
    field === "stageId"
      ? [
          ...options.filter((o) => !isUnqualifiedStage(o.key ?? "", o.label)),
          {
            value: PRODUCT_QUALIFICATION_ACTION,
            key: "unqualified",
            label: "Unqualified",
            color: "#94a3b8",
          },
        ]
      : options;
  const [qualificationOpen, setQualificationOpen] = useState(false);
  const listboxId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const { primary, additional } = partitionPipelineStageOptions(choices, value);
  const visibleOptions =
    field === "stageId" && !showMoreStages ? primary : choices;
  const selectedOption = choices.find((option) => option.value === value);
  const currentLabel = selectedOption?.label ?? initialLabel;
  const currentColor = selectedOption?.color ?? initialColor ?? "#94a3b8";

  async function saveValue(nextValue: string) {
    const nextOption = choices.find((option) => option.value === nextValue);
    if (
      field === "stageId" &&
      isUnqualifiedStage(nextOption?.key ?? "", nextOption?.label)
    ) {
      setIsOpen(false);
      setQualificationOpen(true);
      return;
    }
    if (nextValue === savedValue) {
      setIsOpen(false);
      return;
    }

    const previousValue = savedValue;
    setValue(nextValue);
    setIsOpen(false);
    setIsSaving(true);
    setHasError(false);
    setMessage(`Saving ${field === "stageId" ? "stage" : "priority"}...`);

    if (previewMode) {
      setSavedValue(nextValue);
      router.refresh();
      setMessage(`${field === "stageId" ? "Stage" : "Priority"} updated.`);
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/leads/${leadId}/workflow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: nextValue }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setValue(previousValue);
        setHasError(true);
        setMessage(payload?.error ?? "We couldn't update this lead right now.");
        setIsSaving(false);
        return;
      }

      setSavedValue(nextValue);
      router.refresh();
      setMessage(`${field === "stageId" ? "Stage" : "Priority"} updated.`);
      setIsSaving(false);
    } catch {
      setValue(previousValue);
      setHasError(true);
      setMessage("We couldn't update this lead right now.");
      setIsSaving(false);
    }
  }

  return (
    <div className="min-w-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        disabled={isSaving || options.length === 0}
        className="ld-focus-ring inline-flex min-h-10 max-w-full min-w-0 items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.075] py-1.5 pl-2.5 pr-2 text-[11px] font-semibold uppercase tracking-[0.025em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_8px_18px_rgba(2,6,23,0.16)] transition hover:border-white/24 hover:bg-white/[0.11] disabled:cursor-wait disabled:opacity-70"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Change lead ${field === "stageId" ? "stage" : "priority"}. Current value: ${currentLabel}`}
        aria-busy={isSaving}
        data-lead-id={leadId}
        data-testid={testId}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full shadow-[0_0_10px_currentColor]"
          style={{ backgroundColor: currentColor, color: currentColor }}
        />
        <span className="min-w-0 truncate" title={currentLabel}>
          {currentLabel}
        </span>
        {isSaving ? (
          <LoaderCircle className="h-3 w-3 shrink-0 animate-spin text-white/64" />
        ) : (
          <ChevronDown
            className={cn(
              "h-3 w-3 shrink-0 text-white/60 transition",
              isOpen && "rotate-180",
            )}
          />
        )}
      </button>

      <ResponsivePopover
        anchorRef={buttonRef}
        ariaLabel={pickerTitle}
        desktopWidth={270}
        onClose={() => setIsOpen(false)}
        open={isOpen}
      >
        <div id={listboxId} className="flex min-h-0 flex-1 flex-col">
          <AdminPickerHeader
            title={pickerTitle}
            description={pickerDescription}
            onClose={() => setIsOpen(false)}
          />
          <AdminPickerScrollArea className="pr-1" role="listbox">
            {visibleOptions.map((option, index) => {
              const isCurrent = option.value === value;
              const optionColor = option.color ?? "#94a3b8";
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void saveValue(option.value)}
                  className={cn(
                    "ld-focus-ring flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left text-sm transition hover:bg-white/[0.08] hover:text-white",
                    isCurrent ? "bg-white/[0.075] text-white" : "text-white/76",
                  )}
                  role="option"
                  aria-selected={isCurrent}
                  data-popover-autofocus={isCurrent || undefined}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void saveValue(option.value);
                      return;
                    }
                    if (
                      !["ArrowDown", "ArrowUp", "Home", "End"].includes(
                        event.key,
                      )
                    )
                      return;
                    event.preventDefault();
                    const optionButtons = event.currentTarget
                      .closest('[role="listbox"]')
                      ?.querySelectorAll<HTMLButtonElement>('[role="option"]');
                    const nextIndex =
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? visibleOptions.length - 1
                          : event.key === "ArrowDown"
                            ? Math.min(index + 1, visibleOptions.length - 1)
                            : Math.max(index - 1, 0);
                    optionButtons?.[nextIndex]?.focus({ preventScroll: true });
                  }}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: optionColor }}
                  />
                  <span className="min-w-0 flex-1 font-semibold">
                    {option.label}
                  </span>
                  {isCurrent ? (
                    <Check className="h-4 w-4 text-[var(--ld-color-accent)]" />
                  ) : null}
                </button>
              );
            })}
            {field === "stageId" && additional.length ? (
              <button
                type="button"
                className="min-h-11 w-full border-t border-white/10 px-3 py-3 text-left text-sm text-white/60"
                onClick={() => setShowMoreStages((v) => !v)}
              >
                {showMoreStages
                  ? "Show major stages"
                  : `More configured stages (${additional.length})`}
              </button>
            ) : null}
          </AdminPickerScrollArea>
        </div>
      </ResponsivePopover>

      {qualificationOpen ? (
        <LeadQualificationDialog
          leadId={leadId}
          open
          anchorRef={buttonRef}
          onClose={() => setQualificationOpen(false)}
        />
      ) : null}
      <p
        className={cn(
          "sr-only",
          hasError && "not-sr-only mt-1 max-w-52 text-xs text-rose-200",
        )}
        role={hasError ? "alert" : "status"}
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}
