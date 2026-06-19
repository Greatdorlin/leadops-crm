"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CelebrationMoment } from "@/lib/crm/celebrations";

const intensityClasses = {
  soft: "from-sky-50 via-white to-emerald-50 border-sky-200/80",
  strong: "from-violet-50 via-white to-sky-50 border-violet-200/80",
  burst: "from-amber-50 via-white to-emerald-50 border-amber-200/80",
} as const;

export function CelebrationPanel({
  celebration,
  onClose,
  className,
  autoHideMs = 5000,
}: {
  celebration: CelebrationMoment | null;
  onClose?: () => void;
  className?: string;
  autoHideMs?: number;
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
        color:
          index % 3 === 0 ? "#f4b400" : index % 3 === 1 ? "#60a5fa" : "#34d399",
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
          className={cn(
            "celebration-glow relative overflow-hidden rounded-[26px] border bg-gradient-to-br p-4 shadow-[0_20px_40px_rgba(15,23,42,0.08)]",
            intensityClasses[celebration.intensity],
            className,
          )}
          style={celebration.intensity !== "soft" ? { animation: "celebrationPulse 2.4s ease-in-out 1" } : undefined}
        >
          {celebration.intensity !== "soft" ? (
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
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/82 text-[color:var(--color-primary)] shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
              {celebration.intensity === "burst" ? <Trophy className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-slate-950">{celebration.title}</p>
                <span className="rounded-full border border-white/70 bg-white/86 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  {celebration.badge}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{celebration.message}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDismissedKey(celebrationKey);
                onClose?.();
              }}
              className="ml-auto rounded-full border border-white/70 bg-white/82 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-900"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
