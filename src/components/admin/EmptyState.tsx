import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-[26px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,249,255,0.92)_100%)] px-5 py-8 text-center shadow-[0_16px_34px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.78)]">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-slate-200 bg-white text-slate-500 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
