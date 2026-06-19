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
    <div className={cn("inline-flex items-center gap-3", toneClass.text, className)}>
      {resolvedLogoUrl ? (
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-white/90 shadow-[0_14px_30px_rgba(15,23,42,0.12)]">
          <Image
            src={resolvedLogoUrl}
            alt={`${companyName} logo`}
            width={44}
            height={44}
            className="h-full w-full object-cover"
            unoptimized
          />
        </span>
      ) : (
        <span
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] text-sm font-black tracking-[0.18em]",
            toneClass.badge,
          )}
        >
          {companyName
            .split(/\s+/)
            .map((part) => part.charAt(0).toUpperCase())
            .join("")
            .slice(0, 2) || "LD"}
        </span>
      )}
      {variant === "mark" ? null : (
        <span className="min-w-0">
          <span className="block font-[family:var(--font-heading)] text-[1.45rem] font-bold leading-none tracking-[-0.05em]">
            {companyName}
          </span>
          <span
            className={cn(
              "mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em]",
              toneClass.helper,
            )}
          >
            {subtitle}
          </span>
        </span>
      )}
    </div>
  );
}
