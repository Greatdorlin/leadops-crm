import type { PathwayMatch } from "@/lib/pathway-engine/types";

export function PathwayMatchCard({ match, index }: { match: PathwayMatch; index: number }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 print:border-slate-200 print:bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--fc-yellow)] print:text-slate-500">
            Top match 0{index + 1}
          </p>
          <h3 className="mt-2 [font-family:var(--font-heading)] text-2xl leading-none text-white print:text-slate-950">
            {match.title}
          </h3>
        </div>
        <div className="rounded-full border border-white/10 bg-[rgba(16,16,82,0.75)] px-4 py-2 text-right print:border-slate-200 print:bg-slate-50">
          <p className="text-xl font-semibold text-white print:text-slate-950">{match.score}</p>
          <p className="text-xs text-white/55 print:text-slate-500">{match.scoreLabel}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-white/70 print:text-slate-700">{match.summary}</p>
      <p className="mt-3 text-sm leading-7 text-white/58 print:text-slate-600">{match.reason}</p>
    </article>
  );
}

