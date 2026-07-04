import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { GlassCard } from "./GlassCard";

export function PremiumEmptyState({
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
    <GlassCard className="px-6 py-10 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white/72">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-2xl font-semibold tracking-[-0.05em] text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/70">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </GlassCard>
  );
}
