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
    <div className="ld-glass-card ld-glass-soft rounded-[26px] border border-white/10 bg-white/[0.045] px-5 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_48px_rgba(0,0,0,0.18)]">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/12 bg-white/[0.07] text-white/66 shadow-[0_14px_28px_rgba(0,0,0,0.2)]">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-[1.35rem] font-semibold tracking-[-0.04em] text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/58">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
