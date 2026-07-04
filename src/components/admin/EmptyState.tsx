import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";
import { GradientText } from "./ui/GradientText";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn(
      "ld-glass-card ld-glass-soft rounded-[26px] border border-white/10 bg-white/[0.045] px-5 py-8 sm:px-6 sm:py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_48px_rgba(0,0,0,0.18)]",
      className
    )}>
      <div className="ld-animate-scale-in relative mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/12 bg-gradient-to-br from-white/[0.09] to-white/[0.03] text-white/70 shadow-[0_14px_28px_rgba(0,0,0,0.2)]">
        <div className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-[var(--ld-color-primary)]/20 to-[var(--ld-color-accent)]/20 opacity-60" />
        <Icon className="relative h-6 w-6" />
      </div>
      <h3 className="mt-5 text-[1.35rem] font-semibold tracking-[-0.04em]">
        <GradientText>{title}</GradientText>
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/70">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
