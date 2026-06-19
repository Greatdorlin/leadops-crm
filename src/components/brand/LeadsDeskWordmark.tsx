import { cn } from "@/lib/cn";

type LeadsDeskWordmarkTone = "dark" | "light";
type LeadsDeskWordmarkVariant = "full" | "mark";

const toneClasses: Record<LeadsDeskWordmarkTone, { badge: string; helper: string; text: string }> = {
  dark: {
    badge:
      "bg-[linear-gradient(180deg,#f5c84c_0%,#e7ab00_100%)] text-[#101052] shadow-[0_14px_30px_rgba(231,171,0,0.22)]",
    helper: "text-[#101052]/62",
    text: "text-[#101052]",
  },
  light: {
    badge:
      "bg-[linear-gradient(180deg,#f5c84c_0%,#e7ab00_100%)] text-[#101052] shadow-[0_14px_30px_rgba(231,171,0,0.2)]",
    helper: "text-white/62",
    text: "text-white",
  },
};

export function LeadsDeskWordmark({
  className,
  tone = "dark",
  variant = "full",
}: {
  className?: string;
  tone?: LeadsDeskWordmarkTone;
  variant?: LeadsDeskWordmarkVariant;
}) {
  const toneClass = toneClasses[tone];

  return (
    <div className={cn("inline-flex items-center gap-3", toneClass.text, className)}>
      <span
        className={cn(
          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] text-sm font-black tracking-[0.18em]",
          toneClass.badge,
        )}
      >
        LD
      </span>
      {variant === "mark" ? null : (
        <span className="min-w-0">
          <span className="block font-[family:var(--font-heading)] text-[1.45rem] font-bold leading-none tracking-[-0.05em]">
            Leads Desk
          </span>
          <span
            className={cn(
              "mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em]",
              toneClass.helper,
            )}
          >
            Private lead management
          </span>
        </span>
      )}
    </div>
  );
}
