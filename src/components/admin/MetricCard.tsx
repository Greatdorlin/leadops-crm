import { cn } from "@/lib/cn";

export function MetricCard({
  label,
  value,
  supporting,
  className,
  tone = "default",
}: {
  label: string;
  value: string | number;
  supporting?: string;
  className?: string;
  tone?: "default" | "accent" | "positive" | "warning" | "danger";
}) {
  const toneClass = {
    default:
      "border-[#dde5f1] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,249,255,0.94)_100%)]",
    accent:
      "border-[#111c5a] bg-[linear-gradient(145deg,#071338_0%,#13215f_64%,#1f3183_100%)] shadow-[0_24px_48px_rgba(7,19,56,0.2)]",
    positive:
      "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(243,253,248,0.98)_0%,rgba(220,252,231,0.9)_100%)]",
    warning:
      "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,238,0.98)_0%,rgba(254,243,199,0.9)_100%)]",
    danger:
      "border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,244,245,0.98)_0%,rgba(255,228,230,0.9)_100%)]",
  }[tone];
  const highlightClassMap: Partial<
    Record<"default" | "accent" | "positive" | "warning" | "danger", string>
  > = {
    accent: "border-[color:var(--fc-yellow)]/35 bg-[color:var(--fc-yellow)]/12 text-[color:var(--fc-yellow)]",
    positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
  };
  const highlightLabelMap: Partial<
    Record<"default" | "accent" | "positive" | "warning" | "danger", string>
  > = {
    accent: "Focus",
    positive: "Healthy",
    warning: "Watch",
    danger: "Alert",
  };
  const highlightClass = highlightClassMap[tone];
  const highlightLabel = highlightLabelMap[tone];

  return (
    <div
      className={cn(
        "relative flex h-full min-h-[176px] flex-col overflow-hidden rounded-[28px] border p-5 shadow-[0_16px_34px_rgba(15,23,42,0.06)]",
        toneClass,
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 opacity-90",
          tone === "accent"
            ? "bg-[radial-gradient(circle_at_top,rgba(255,204,76,0.16),transparent_68%)]"
            : "bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.1),transparent_70%)]",
        )}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-4">
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.16em]",
              tone === "accent" ? "text-white/58" : "text-slate-500",
            )}
          >
            {label}
          </p>
          {highlightLabel ? (
            <span
              className={cn(
                "inline-flex min-w-[3.75rem] items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                highlightClass,
              )}
            >
              {highlightLabel}
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            "mt-6 text-[2.35rem] font-semibold leading-none tracking-[-0.06em] sm:text-[2.55rem]",
            tone === "accent" ? "text-white" : "text-slate-950",
          )}
        >
          {value}
        </p>
        {supporting ? (
          <p
            className={cn(
              "mt-auto max-w-[28ch] pt-5 text-sm leading-6",
              tone === "accent" ? "text-white/72" : "text-slate-500",
            )}
          >
            {supporting}
          </p>
        ) : null}
      </div>
    </div>
  );
}
