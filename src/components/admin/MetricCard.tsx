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
      "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.04)_100%)]",
    accent:
      "border-[color:var(--ld-color-accent)]/32 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--ld-color-accent)_26%,transparent),transparent_42%),linear-gradient(145deg,rgba(59,130,246,0.2)_0%,rgba(139,92,246,0.14)_58%,rgba(255,255,255,0.04)_100%)]",
    positive:
      "border-emerald-300/22 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.035)_100%)]",
    warning:
      "border-amber-300/24 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.22),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.035)_100%)]",
    danger:
      "border-rose-300/24 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.22),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.035)_100%)]",
  }[tone];
  const highlightClassMap: Partial<
    Record<"default" | "accent" | "positive" | "warning" | "danger", string>
  > = {
    accent: "border-[color:var(--ld-color-accent)]/35 bg-[color:var(--ld-color-accent)]/12 text-[color:var(--ld-color-accent)]",
    positive: "border-emerald-300/30 bg-emerald-300/12 text-emerald-100",
    warning: "border-amber-300/30 bg-amber-300/12 text-amber-100",
    danger: "border-rose-300/30 bg-rose-300/12 text-rose-100",
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
        "relative flex h-full min-h-[176px] flex-col overflow-hidden rounded-[28px] border p-5 shadow-[var(--ld-shadow-card)] backdrop-blur-[18px]",
        toneClass,
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 opacity-90",
          tone === "accent"
            ? "bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.2),transparent_68%)]"
            : "bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.12),transparent_70%)]",
        )}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-4">
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.16em]",
              "text-white/52",
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
            "text-white",
          )}
        >
          {value}
        </p>
        {supporting ? (
          <p
            className={cn(
              "mt-auto max-w-[28ch] pt-5 text-sm leading-6",
              "text-white/58",
            )}
          >
            {supporting}
          </p>
        ) : null}
      </div>
    </div>
  );
}
