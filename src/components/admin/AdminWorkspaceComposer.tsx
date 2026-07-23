"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  FileUp,
  ListTodo,
  ClipboardCheck as Sparkles,
  UserPlus,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import type { CustomFieldDefinitionWithOptions } from "@/lib/crm/custom-field-values";
import type { CrmMigrationSource } from "@/lib/migrations/sources";
import {
  WORKSPACE_COMPOSER_OPEN_EVENT,
  type WorkspaceComposerMode,
} from "@/lib/crm/workspace-composer";
import { LeadAssignmentForm } from "./LeadAssignmentForm";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { LeadImportForm } from "./LeadImportForm";
import { LeadTaskForm } from "./LeadTaskForm";

export function AdminWorkspaceComposer({
  accessLevel,
  leadOptions,
  assignmentLeadOptions,
  assigneeOptions,
  defaultAssignedTo = "",
  defaultLeadId,
  initialMode,
  variant = "hero",
  leadCaptureCustomFields = [],
  leadCaptureStageOptions,
  initialMigrationSource,
  allowedModes,
  defaultCountry = "",
  defaultRegion = "",
  defaultCity = "",
}: {
  accessLevel: AdminAccessLevel;
  leadOptions: Array<{ value: string; label: string }>;
  assignmentLeadOptions: Array<{
    value: string;
    label: string;
    assignedTo: string | null;
    stage: string;
    priority: Parameters<typeof LeadAssignmentForm>[0]["leadOptions"][number]["priority"];
  }>;
  assigneeOptions: Array<{ label: string; value: string }>;
  defaultAssignedTo?: string;
  defaultLeadId?: string;
  initialMode?: WorkspaceComposerMode;
  variant?: "hero" | "compact";
  leadCaptureCustomFields?: CustomFieldDefinitionWithOptions[];
  leadCaptureStageOptions?: Array<{
    value: string;
    key: string;
    label: string;
    stageId?: string;
  }>;
  initialMigrationSource?: CrmMigrationSource;
  allowedModes?: WorkspaceComposerMode[];
  defaultCountry?: string;
  defaultRegion?: string;
  defaultCity?: string;
}) {
  const defaultModes: WorkspaceComposerMode[] =
    accessLevel === "sales_rep" || accessLevel === "affiliate"
      ? ["task", "lead"]
      : ["lead", "task", "assignment", "import"];
  const availableModes = (allowedModes?.length ? allowedModes : defaultModes).filter((mode, index, list) => list.indexOf(mode) === index);
  const availableModeKey = availableModes.join("|");
  const [mode, setMode] = useState<WorkspaceComposerMode>(
    initialMode && availableModes.includes(initialMode)
      ? initialMode
      : defaultLeadId && availableModes.includes("task")
        ? "task"
        : (availableModes[0] ?? "task"),
  );
  useEffect(() => {
    function handleOpen(event: Event) {
      const requestedMode = (event as CustomEvent<{ mode?: WorkspaceComposerMode }>).detail?.mode;
      const allowed = availableModeKey.split("|") as WorkspaceComposerMode[];
      if (requestedMode && allowed.includes(requestedMode)) {
        setMode(requestedMode);
      }
    }

    window.addEventListener(WORKSPACE_COMPOSER_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(WORKSPACE_COMPOSER_OPEN_EVENT, handleOpen);
  }, [availableModeKey]);

  const contentByMode = {
    task: {
      icon: ListTodo,
      tabLabel: "Create task",
      eyebrow: accessLevel === "sales_rep" ? "Create task" : "Assign task",
      title: accessLevel === "sales_rep" ? "Keep your next follow-up visible" : "Create the next team action",
      description:
        accessLevel === "sales_rep"
          ? "Add the next reminder."
          : "Tie the task to a lead.",
      highlights: ["Choose the lead", "Set a due date", "Keep follow-up visible"],
      supportTitle: "Best for",
      supportLines: [
        "Calls, reminders, and next-step follow-ups.",
        "Routing work to yourself or another rep.",
      ],
      body: (
        <LeadTaskForm
          leadId={defaultLeadId}
          leadOptions={leadOptions}
          assigneeOptions={assigneeOptions}
          defaultAssignedTo={defaultAssignedTo}
        />
      ),
    },
    assignment: {
      icon: Users2,
      tabLabel: "Assign lead",
      eyebrow: "Assign lead",
      title: "Route work to the right rep",
      description: "Set owner, stage, and priority.",
      highlights: ["Choose the lead", "Pick the owner", "Save clean routing"],
      supportTitle: "Best for",
      supportLines: [
        "Clearing unassigned leads fast.",
        "Keeping stage and ownership aligned.",
      ],
      body: <LeadAssignmentForm leadOptions={assignmentLeadOptions} assigneeOptions={assigneeOptions} />,
    },
    lead: {
      icon: UserPlus,
      tabLabel: "Add lead",
      eyebrow: "Add lead",
      title: "Capture a lead manually",
      description: "For off-channel leads.",
      highlights: ["Capture contact", "Choose a stage", "Assign instantly"],
      supportTitle: "Best for",
      supportLines: [
        "Walk-ins, referrals, and manual entries.",
        "Getting new leads into the CRM immediately.",
      ],
      body: (
        <LeadCaptureForm
          accessLevel={accessLevel}
          assigneeOptions={assigneeOptions}
          defaultAssignedTo={defaultAssignedTo}
          customFieldDefinitions={leadCaptureCustomFields}
          stageOptions={leadCaptureStageOptions}
          defaultCountry={defaultCountry}
          defaultRegion={defaultRegion}
          defaultCity={defaultCity}
        />
      ),
    },
    import: {
      icon: FileUp,
      tabLabel: "Import leads",
      eyebrow: "Import leads",
      title: "Bring in a fresh batch",
      description: "Paste rows or load a CSV.",
      highlights: ["Paste or upload", "Assign a default owner", "Review the batch"],
      supportTitle: "Best for",
      supportLines: [
        "Bulk lead uploads from outside tools.",
        "Cleaning up older lead lists quickly.",
      ],
      body: (
        <LeadImportForm
          assigneeOptions={assigneeOptions}
          initialSourceSystem={initialMigrationSource}
        />
      ),
    },
  } satisfies Record<
    WorkspaceComposerMode,
    {
      icon: typeof ListTodo;
      tabLabel: string;
      eyebrow: string;
      title: string;
      description: string;
      highlights: string[];
      supportTitle: string;
      supportLines: string[];
      body: ReactNode;
    }
  >;

  const current = contentByMode[mode];
  const CurrentIcon = current.icon;
  const isCompact = variant === "compact";

  return (
    <section
      className={cn(
        "ld-glass-panel relative overflow-hidden p-4 shadow-[0_28px_70px_rgba(0,0,0,0.2)] sm:p-6",
        isCompact ? "rounded-[28px] sm:rounded-[32px]" : "rounded-[30px] sm:rounded-[36px]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--ld-color-primary)_18%,transparent),transparent_34%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.2),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_100%)]" />
      <div className="relative flex flex-col gap-5">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:rounded-[28px] sm:p-3">
          <div className={cn("grid gap-2", isCompact ? "md:grid-cols-2 2xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-4")}>
            {availableModes.map((item) => (
              (() => {
                const itemContent = contentByMode[item];
                const ItemIcon = itemContent.icon;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    className={cn(
                      "rounded-[20px] border px-3 py-3 text-left transition sm:rounded-[24px] sm:px-4",
                      item === mode
                        ? "border-[color:var(--ld-color-accent)]/35 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--ld-color-primary)_28%,transparent)_0%,color-mix(in_srgb,var(--ld-color-accent)_22%,transparent)_68%,rgba(255,255,255,0.08)_100%)] text-white shadow-[0_18px_34px_rgba(7,19,56,0.22)]"
                        : "border-white/8 bg-white/[0.07] text-white/70 hover:border-white/16 hover:bg-white/[0.1] hover:text-white",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border sm:h-10 sm:w-10 sm:rounded-[16px]",
                          item === mode
                            ? "border-white/12 bg-white/10 text-[color:var(--ld-color-accent)]"
                            : "border-white/10 bg-white/[0.08] text-white/70",
                        )}
                      >
                        <ItemIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{itemContent.tabLabel}</p>
                        <p
                          className={cn(
                              "mt-1 hidden text-xs sm:block",
                            item === mode ? "text-white/70" : "text-white/70",
                          )}
                        >
                          {itemContent.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })()
            ))}
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(145deg,rgba(8,17,48,0.92)_0%,rgba(16,31,89,0.76)_54%,rgba(29,53,134,0.72)_100%)] p-4 text-white shadow-[0_28px_54px_rgba(0,0,0,0.24)] sm:rounded-[32px] sm:p-6">
          <div className={cn("flex flex-col gap-5", isCompact ? "2xl:flex-row 2xl:items-end 2xl:justify-between" : "xl:flex-row xl:items-end xl:justify-between")}>
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                {current.eyebrow}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/12 bg-white/10 text-[color:var(--ld-color-accent)]">
                  <CurrentIcon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Action center
                </span>
              </div>
              <h3 className="mt-4 font-[family:var(--font-heading)] text-[1.65rem] leading-[1.1] tracking-[-0.05em] text-white sm:text-[2.2rem]">
                {current.title}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">{current.description}</p>
            </div>

            {!isCompact ? (
              <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[24rem]">
                {current.highlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="rounded-[18px] border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-medium text-white/84"
                  >
                    {highlight}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className={cn("grid gap-4", !isCompact && "xl:grid-cols-[minmax(0,1.12fr)_280px]")}>
          <div className="rounded-[26px] border border-white/10 bg-black/18 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] sm:rounded-[32px] sm:p-5">
            {current.body}
          </div>

          {!isCompact ? <aside className="space-y-4">
            <div className="ld-glass-card ld-glass-soft rounded-[28px] p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[color:var(--ld-color-accent)]/25 bg-[color:var(--ld-color-accent)]/14 text-[color:var(--ld-color-accent)]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    {current.supportTitle}
                  </p>
                  <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-white">
                    {current.tabLabel}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {current.supportLines.map((line) => (
                  <div
                    key={line}
                    className="rounded-[18px] border border-white/10 bg-white/[0.06] px-4 py-3 text-sm leading-6 text-white/70"
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>

          </aside> : null}
        </div>
      </div>
    </section>
  );
}
