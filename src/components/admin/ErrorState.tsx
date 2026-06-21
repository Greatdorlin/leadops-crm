import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export function ErrorState({
  title,
  description,
  details,
  action,
}: {
  title: string;
  description: string;
  details?: string | null;
  action?: ReactNode;
}) {
  return (
    <div className="ld-glass-card ld-glass-soft rounded-[30px] border border-rose-300/20 bg-rose-400/[0.055] px-6 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200/24 bg-rose-300/12 text-rose-100 shadow-[0_14px_32px_rgba(244,63,94,0.14)]">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/62">{description}</p>
      {details ? (
        <details className="mx-auto mt-4 max-w-3xl rounded-2xl border border-rose-200/18 bg-black/20 p-4 text-left">
          <summary className="cursor-pointer text-sm font-semibold text-rose-100">
            Development details
          </summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/58">
            {details}
          </pre>
        </details>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
