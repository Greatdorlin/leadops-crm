import Image from "next/image";
import { cn } from "@/lib/cn";
import { resolveBrandLogo } from "@/lib/crm/workspace-settings";

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
  companyName = "Leads Desk",
  subtitle = "Private lead management",
  logoUrl,
  logoUrlLightMode,
  logoUrlDarkMode,
  surfaceMode,
}: {
  className?: string;
  tone?: LeadsDeskWordmarkTone;
  variant?: LeadsDeskWordmarkVariant;
  companyName?: string;
  subtitle?: string;
  logoUrl?: string | null;
  logoUrlLightMode?: string | null;
  logoUrlDarkMode?: string | null;
  surfaceMode?: "light" | "dark";
}) {
  const toneClass = toneClasses[tone];
  const resolvedLogoUrl = resolveBrandLogo({
    logoUrl,
    logoUrlLightMode,
    logoUrlDarkMode,
    surfaceMode: surfaceMode ?? (tone === "light" ? "dark" : "light"),
  });

  return (
    <div className={cn("inline-flex min-w-0 items-center gap-3", toneClass.text, className)}>
      {resolvedLogoUrl ? (
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-white/10 bg-white/90 shadow-[0_14px_30px_rgba(15,23,42,0.12)]">
          <Image
            key={resolvedLogoUrl ?? "default-logo"}
            src={resolvedLogoUrl}
            alt={`${companyName} logo`}
            width={40}
            height={40}
            className="h-full w-full object-cover"
            unoptimized
          />
        </span>
      ) : (
        <span className="ld-brand-mark" aria-hidden="true">
          <span />
        </span>
      )}
      {variant === "mark" ? null : (
        <span className="min-w-0">
          <span className="block truncate whitespace-nowrap font-[family:var(--font-heading)] text-[1.18rem] font-bold leading-none tracking-[-0.04em]">
            {companyName}
          </span>
          {subtitle ? (
            <span
              className={cn(
                "mt-1 block truncate whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.16em]",
                toneClass.helper,
              )}
            >
              {subtitle}
            </span>
          ) : null}
        </span>
      )}
    </div>
  );
}
