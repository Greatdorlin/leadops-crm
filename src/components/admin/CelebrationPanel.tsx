"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CelebrationMoment } from "@/lib/crm/celebrations";
import type { CelebrationStyle } from "@/lib/crm/workspace-settings";

const styleStrength: Record<CelebrationStyle, { primary: number; accent: number; glow: number }> = {
  subtle: { primary: 10, accent: 7, glow: 14 },
  balanced: { primary: 19, accent: 13, glow: 24 },
  bold: { primary: 31, accent: 23, glow: 38 },
};

export function CelebrationPanel({
  celebration,
  onClose,
  className,
  autoHideMs = 5000,
  styleMode = "balanced",
}: {
  celebration: CelebrationMoment | null;
  onClose?: () => void;
  className?: string;
  autoHideMs?: number;
  styleMode?: CelebrationStyle;
}) {
  const celebrationKey = celebration
    ? `${celebration.title}:${celebration.badge}:${celebration.intensity}`
    : null;
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const visible = Boolean(celebration && dismissedKey !== celebrationKey);

  useEffect(() => {
    if (!celebration || autoHideMs <= 0 || !visible || !celebrationKey) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setDismissedKey(celebrationKey);
      onClose?.();
    }, autoHideMs);

    return () => window.clearTimeout(timeout);
  }, [autoHideMs, celebration, celebrationKey, onClose, visible]);

  const pieces = useMemo(
    () =>
      Array.from({ length: celebration?.intensity === "burst" ? 18 : 10 }, (_, index) => ({
        id: index,
        left: `${(index * 11) % 100}%`,
        delay: `${index * 0.06}s`,
        color: index % 2 === 0 ? "var(--ld-color-primary)" : "var(--ld-color-accent)",
        drift: `${(index % 2 === 0 ? 1 : -1) * (16 + (index % 5) * 6)}px`,
      })),
    [celebration?.intensity],
  );

  return (
    <AnimatePresence>
      {celebration && visible ? (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className={cn("celebration-glow relative overflow-hidden rounded-[26px] border p-4", className)}
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, var(--ld-color-primary) ${styleStrength[styleMode].primary}%, var(--ld-color-card-strong)), color-mix(in srgb, var(--ld-color-accent) ${styleStrength[styleMode].accent}%, var(--ld-color-surface)))`,
            borderColor: `color-mix(in srgb, var(--ld-color-accent) ${Math.max(styleStrength[styleMode].accent, 16)}%, rgba(255,255,255,0.12))`,
            boxShadow: `0 22px 52px color-mix(in srgb, var(--ld-color-primary) ${styleStrength[styleMode].glow}%, transparent), inset 0 1px 0 rgba(255,255,255,0.12)`,
            ...(celebration.intensity !== "soft" && styleMode !== "subtle" ? { animation: "celebrationPulse 2.4s ease-in-out 1" } : {}),
          }}
        >
          {celebration.intensity !== "soft" && styleMode !== "subtle" ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 overflow-hidden">
              {pieces.map((piece) => (
                <span
                  key={piece.id}
                  className="absolute top-2 h-3 w-2 rounded-full"
                  style={{
                    left: piece.left,
                    backgroundColor: piece.color,
                    animation: `celebrationConfettiFall 1.45s ease-out ${piece.delay} forwards`,
                    ["--confetti-x" as string]: piece.drift,
                  }}
                />
              ))}
            </div>
          ) : null}

          <div className="relative flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-[color:var(--color-primary)] shadow-[0_12px_28px_rgba(0,0,0,0.08)]">
              {celebration.intensity === "burst" ? <Trophy className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-white">{celebration.title}</p>
                <span className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                  {celebration.badge}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-white/70">{celebration.message}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDismissedKey(celebrationKey);
                onClose?.();
              }}
              className="ml-auto rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 transition hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
