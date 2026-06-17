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
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      {details ? (
        <details className="mx-auto mt-4 max-w-3xl rounded-2xl border border-rose-200/80 bg-white/80 p-4 text-left">
          <summary className="cursor-pointer text-sm font-semibold text-rose-700">
            Development details
          </summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
            {details}
          </pre>
        </details>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
