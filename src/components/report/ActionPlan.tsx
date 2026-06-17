import { ChevronDown } from "lucide-react";
import type { ActionPlanWindow } from "@/lib/pathway-engine/types";

export function ActionPlan({
  plan,
  active = false,
  defaultOpen = false,
}: {
  plan: ActionPlanWindow;
  active?: boolean;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className={`rounded-[24px] ${active ? "report-panel" : "report-panel-soft"} p-5 print:border-slate-200 print:bg-white print:shadow-none`}
      open={active || defaultOpen ? true : undefined}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <div>
          <p className={`report-kicker ${active ? "text-[color:var(--fc-yellow)]" : "text-white/48 print:text-slate-500"}`}>
            {active ? "Focus now" : "Coming up"}
          </p>
          <h3 className="report-title mt-2 text-[1.45rem] leading-[1.02] text-white print:text-slate-950">
            {plan.title}
          </h3>
          <p className="mt-3 max-w-[42ch] text-sm leading-7 text-white/64 print:text-slate-700">
            {plan.steps[0]}
          </p>
        </div>
        <div className="mt-1 rounded-full border border-white/10 bg-white/[0.05] p-2 text-white/62 print:border-slate-200 print:bg-slate-50 print:text-slate-500">
          <ChevronDown className="h-4 w-4" />
        </div>
      </summary>

      <ol className="mt-5 space-y-3">
        {plan.steps.map((step, index) => (
          <li
            key={step}
            className="rounded-[18px] border border-white/8 bg-black/10 px-4 py-3 text-sm leading-7 text-white/72 print:border-slate-200 print:bg-slate-50 print:text-slate-700"
          >
            <span className="mr-2 text-[color:var(--fc-yellow)] print:text-slate-500">
              {index + 1}.
            </span>
            {step}
          </li>
        ))}
      </ol>
    </details>
  );
}

