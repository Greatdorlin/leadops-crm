"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Check, ChevronRight, Compass, Globe2, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

interface OptionCardProps {
  label: string;
  description?: string;
  flagAlt?: string;
  flagSrc?: string;
  icon?: "compass" | "globe" | "sparkles";
  eyebrow?: string;
  singleLineLabel?: boolean;
  size?: "default" | "compact" | "dense";
  selected: boolean;
  onClick: () => void;
}

function themeClass(label: string) {
  const value = label.toLowerCase();

  if (value === "uk" || value.includes("united kingdom") || value.includes("european union")) {
    return "from-[#25417a] via-[#1d265f] to-[#10152d]";
  }

  if (
    value.includes("canada") ||
    value.includes("australia") ||
    value.includes("new zealand") ||
    value.includes("finland") ||
    value.includes("uae")
  ) {
    return "from-[#35546d] via-[#1e3351] to-[#101a2f]";
  }

  if (value === "usa" || value.includes("united states")) {
    return "from-[#4b557a] via-[#1d2551] to-[#11162e]";
  }

  if (value.includes("china") || value.includes("turkey")) {
    return "from-[#5f3b45] via-[#2a254b] to-[#10162e]";
  }

  if (value.includes("africa") || value.includes("open to different countries")) {
    return "from-[#41554a] via-[#1b2d39] to-[#10182a]";
  }

  if (value.includes("within 3 months") || value.includes("3 - 6 months")) {
    return "from-[#614627] via-[#30214a] to-[#141a32]";
  }

  if (
    value.includes("fully ready") ||
    value.includes("somewhat ready") ||
    value.includes("just getting started")
  ) {
    return "from-[#304c5a] via-[#17244d] to-[#10162f]";
  }

  if (
    value.includes("bachelor") ||
    value.includes("master") ||
    value.includes("doctorate") ||
    value.includes("high school") ||
    value.includes("diploma")
  ) {
    return "from-[#43352a] via-[#1c274d] to-[#11172d]";
  }

  if (
    value.includes("yes, i have") ||
    value.includes("few options") ||
    value.includes("country in mind")
  ) {
    return "from-[#375673] via-[#1a2950] to-[#10162d]";
  }

  if (value.includes("not sure") || value.includes("other")) {
    return "from-[#3c3f61] via-[#18234a] to-[#0f1429]";
  }

  return "from-[#2f4269] via-[#1b2850] to-[#11182d]";
}

function labelClass(label: string) {
  if (label.length > 26) {
    return "text-[1.12rem] md:text-[1.28rem]";
  }

  if (label.length > 18) {
    return "text-[1.24rem] md:text-[1.42rem]";
  }

  return "text-[1.34rem] md:text-[1.55rem]";
}

function BadgeGlyph({
  icon,
  selected,
}: {
  icon: NonNullable<OptionCardProps["icon"]>;
  selected: boolean;
}) {
  const className = cn(
    "h-[1.05rem] w-[1.05rem]",
    selected ? "text-[#101052]" : "text-white/88",
  );

  if (icon === "compass") {
    return <Compass className={className} />;
  }

  if (icon === "sparkles") {
    return <Sparkles className={className} />;
  }

  return <Globe2 className={className} />;
}

export function OptionCard({
  label,
  description,
  flagAlt,
  flagSrc,
  icon,
  eyebrow,
  singleLineLabel = false,
  size = "default",
  selected,
  onClick,
}: OptionCardProps) {
  const isCompact = size === "compact";
  const isDense = size === "dense";

  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full flex-col justify-between overflow-hidden border text-left transition",
        isDense
          ? "min-h-[92px] rounded-[22px] px-3.5 py-3.5 md:min-h-[98px] md:px-4 md:py-4"
          : isCompact
            ? "min-h-[104px] rounded-[24px] px-4 py-4 md:min-h-[110px] md:px-[1.125rem] md:py-[1.125rem]"
            : "min-h-[142px] rounded-[28px] px-5 py-5 md:min-h-[158px] md:px-6 md:py-6",
        selected
          ? "border-[color:var(--fc-yellow)] bg-[#f8f5ef] text-[#101052] shadow-[0_22px_70px_rgba(255,190,0,0.18)]"
          : "border-white/12 bg-white/[0.07] text-white shadow-[0_18px_44px_rgba(0,0,0,0.16)] hover:border-white/22 hover:bg-white/[0.1]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br transition-opacity",
          selected ? "opacity-0" : "opacity-70",
          themeClass(label),
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity",
          selected
            ? "bg-[radial-gradient(circle_at_top_right,rgba(255,190,0,0.2),transparent_42%)] opacity-100"
            : "bg-[linear-gradient(180deg,rgba(7,10,28,0.1),rgba(7,10,28,0.58))] opacity-100",
        )}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,190,0,0.65),transparent)] opacity-0 transition group-hover:opacity-80" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div
            className={cn(
              "min-w-0",
              isDense ? "space-y-2" : isCompact ? "space-y-2.5" : "space-y-3",
            )}
          >
            {flagSrc || icon || eyebrow ? (
              <div className="flex items-center gap-2.5">
                {flagSrc || icon ? (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center overflow-hidden rounded-[14px] border shadow-[0_10px_24px_rgba(0,0,0,0.14)]",
                      isDense ? "h-[2.125rem] w-[2.125rem]" : isCompact ? "h-10 w-10" : "h-11 w-11",
                      selected
                        ? "border-[rgba(16,16,82,0.08)] bg-white text-[#101052]"
                        : "border-white/12 bg-white/10 text-white",
                    )}
                    aria-hidden="true"
                  >
                    {flagSrc ? (
                      <Image
                        src={flagSrc}
                        alt={flagAlt ?? ""}
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    ) : icon ? (
                      <BadgeGlyph icon={icon} selected={selected} />
                    ) : null}
                  </span>
                ) : null}
                {eyebrow ? (
                  <span
                    className={cn(
                      isDense
                        ? "text-[0.61rem] font-semibold uppercase tracking-[0.16em]"
                        : "text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                      selected ? "text-[#101052]/56" : "text-white/52",
                    )}
                  >
                    {eyebrow}
                  </span>
                ) : null}
              </div>
            ) : null}
            <p
              className={cn(
                "text-balance [font-family:var(--font-heading)] leading-[0.96]",
                isDense ? "max-w-[10ch]" : isCompact ? "max-w-[14ch]" : "max-w-[22ch]",
                labelClass(label),
                isDense && "text-[0.98rem] leading-[1.02] md:text-[1.12rem]",
                isCompact && "text-[1.08rem] leading-[1.08] md:text-[1.22rem]",
                singleLineLabel && "max-w-none whitespace-nowrap text-[0.92rem] md:text-[1.04rem]",
                selected ? "text-[#101052]" : "text-white",
              )}
            >
              {label}
            </p>
            {description ? (
              <p
                className={cn(
                  "max-w-[24rem] text-[0.82rem] leading-6 md:text-[0.9rem]",
                  isCompact && "text-[0.76rem] leading-[1.7] md:text-[0.82rem]",
                  selected ? "text-[#101052]/62" : "text-white/66",
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
          <span
            className={cn(
              isDense
                ? "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition"
                : "mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition md:h-10 md:w-10",
              selected
                ? "border-[color:var(--fc-yellow)] bg-[color:var(--fc-yellow)] text-[color:var(--fc-navy)]"
                : "border-white/16 text-white/28 group-hover:border-white/30 group-hover:text-white/58",
            )}
          >
            {selected ? (
              <Check className={cn(isDense ? "h-3 w-3" : "h-3.5 w-3.5 md:h-4 md:w-4")} />
            ) : (
              <ChevronRight
                className={cn(isDense ? "h-3 w-3" : "h-3.5 w-3.5 md:h-4 md:w-4")}
              />
            )}
          </span>
        </div>
        <div
          className={cn(
            isDense ? "mt-3 h-px" : isCompact ? "mt-4 h-px" : "mt-6 h-px",
            selected
              ? "bg-[linear-gradient(90deg,rgba(16,16,82,0.16),transparent)]"
              : "bg-[linear-gradient(90deg,rgba(255,255,255,0.16),transparent)]",
          )}
        />
      </div>
    </motion.button>
  );
}
