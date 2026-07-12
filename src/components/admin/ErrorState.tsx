import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  details?: string | null;
  action?: ReactNode;
}) {
  return (
    <div className="ld-glass-card ld-glass-soft rounded-[30px] border border-rose-300/20 bg-rose-400/[0.055] px-6 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-300/24 bg-rose-300/12 text-rose-100 shadow-[0_14px_32px_rgba(244,63,94,0.14)]">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/70">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
