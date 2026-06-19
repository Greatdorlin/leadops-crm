"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  Download,
  FileUp,
  ListTodo,
  Sparkles,
  UserPlus,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import type { CustomFieldDefinitionWithOptions } from "@/lib/crm/custom-field-values";
import { LeadAssignmentForm } from "./LeadAssignmentForm";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { LeadImportForm } from "./LeadImportForm";
import { LeadTaskForm } from "./LeadTaskForm";

type ComposerMode = "task" | "assignment" | "lead" | "import";

export function AdminWorkspaceComposer({
  accessLevel,
  leadOptions,
  assignmentLeadOptions,
  assigneeOptions,
  defaultAssignedTo = "",
  defaultLeadId,
  variant = "hero",
  leadCaptureCustomFields = [],
}: {
  accessLevel: AdminAccessLevel;
  leadOptions: Array<{ value: string; label: string }>;
  assignmentLeadOptions: Array<{
    value: string;
    label: string;
    assignedTo: string | null;
    crmStatus: Parameters<typeof LeadAssignmentForm>[0]["leadOptions"][number]["crmStatus"];
    priority: Parameters<typeof LeadAssignmentForm>[0]["leadOptions"][number]["priority"];
  }>;
  assigneeOptions: Array<{ label: string; value: string }>;
  defaultAssignedTo?: string;
  defaultLeadId?: string;
  variant?: "hero" | "compact";
  leadCaptureCustomFields?: CustomFieldDefinitionWithOptions[];
}) {
  const availableModes: ComposerMode[] =
    accessLevel === "sales_rep" ? ["task", "lead"] : ["lead", "task", "assignment", "import"];
  const [mode, setMode] = useState<ComposerMode>(
    defaultLeadId && availableModes.includes("task") ? "task" : (availableModes[0] ?? "task"),
  );

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
      body: <LeadImportForm assigneeOptions={assigneeOptions} />,
    },
  } satisfies Record<
    ComposerMode,
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
        "admin-surface relative overflow-hidden p-5 shadow-[0_28px_70px_rgba(15,23,42,0.08)] sm:p-6",
        isCompact ? "rounded-[32px]" : "rounded-[36px]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,rgba(255,190,0,0.24),transparent_34%),radial-gradient(circle_at_top_right,rgba(34,82,219,0.16),transparent_32%),linear-gradient(180deg,rgba(11,18,63,0.08)_0%,transparent_100%)]" />
      <div className="relative flex flex-col gap-5">
        <div className="rounded-[28px] border border-[#0b123f]/8 bg-white/84 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
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
                      "rounded-[24px] border px-4 py-3 text-left transition",
                      item === mode
                        ? "border-[#1b2d77] bg-[linear-gradient(145deg,#0a153d_0%,#152462_68%,#20378e_100%)] text-white shadow-[0_18px_34px_rgba(7,19,56,0.18)]"
                        : "border-transparent bg-white/74 text-slate-700 hover:border-slate-200 hover:bg-white",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex h-10 w-10 items-center justify-center rounded-[16px] border",
                          item === mode
                            ? "border-white/12 bg-white/10 text-[color:var(--fc-yellow)]"
                            : "border-slate-200 bg-slate-50 text-[#1d347f]",
                        )}
                      >
                        <ItemIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{itemContent.tabLabel}</p>
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            item === mode ? "text-white/64" : "text-slate-500",
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

        <div className="rounded-[32px] bg-[linear-gradient(145deg,#081130_0%,#101f59_54%,#1d3586_100%)] p-5 text-white shadow-[0_28px_54px_rgba(7,19,56,0.2)] sm:p-6">
          <div className={cn("flex flex-col gap-5", isCompact ? "2xl:flex-row 2xl:items-end 2xl:justify-between" : "xl:flex-row xl:items-end xl:justify-between")}>
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">
                {current.eyebrow}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/12 bg-white/10 text-[color:var(--fc-yellow)]">
                  <CurrentIcon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/66">
                  Quick actions
                </span>
              </div>
              <h3 className="mt-4 font-[family:var(--font-heading)] text-[1.85rem] leading-[1] tracking-[-0.05em] text-white sm:text-[2.2rem]">
                {current.title}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">{current.description}</p>
            </div>

            <div className={cn("grid gap-2 sm:grid-cols-3", !isCompact && "xl:min-w-[24rem]")}>
              {current.highlights.map((highlight) => (
                <div
                  key={highlight}
                  className="rounded-[18px] border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-medium text-white/84"
                >
                  {highlight}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={cn("grid gap-4", isCompact ? "2xl:grid-cols-[minmax(0,1fr)_300px]" : "xl:grid-cols-[minmax(0,1.12fr)_280px]")}>
          <div className="admin-surface-soft rounded-[32px] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-5">
            {current.body}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.94)_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[#d8e5ff] bg-[#edf4ff] text-[#1d347f]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {current.supportTitle}
                  </p>
                  <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-slate-950">
                    {current.tabLabel}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {current.supportLines.map((line) => (
                  <div
                    key={line}
                    className="rounded-[18px] border border-slate-200/80 bg-white/82 px-4 py-3 text-sm leading-6 text-slate-600"
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,251,239,0.98)_0%,rgba(255,255,255,0.96)_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Fast path
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>Keep the queue light by capturing clean contact details first.</p>
                <p>Assign ownership before moving a lead into the next stage.</p>
                <p>Use tasks for follow-ups that should not disappear from view.</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <Download className="mr-1 inline h-3.5 w-3.5" />
                  Export-ready
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Shared with tasks
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
