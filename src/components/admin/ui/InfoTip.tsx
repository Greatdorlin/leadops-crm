"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

interface TooltipPosition {
  left: number;
  top: number;
  width: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function InfoTip({
  label,
  className,
  align = "center",
}: {
  label: string;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  const tooltipId = useId();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) {
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const margin = 12;
      const gap = 9;
      const width = Math.min(288, window.innerWidth - margin * 2);
      const preferredLeft =
        align === "left"
          ? rect.left
          : align === "right"
            ? rect.right - width
            : rect.left + rect.width / 2 - width / 2;
      const left = clamp(preferredLeft, margin, window.innerWidth - width - margin);
      const height = tooltipRef.current?.offsetHeight ?? 88;
      const placeAbove = window.innerHeight - rect.bottom < height + gap + margin && rect.top > height + gap;
      const top = placeAbove
        ? Math.max(margin, rect.top - height - gap)
        : Math.min(window.innerHeight - height - margin, rect.bottom + gap);

      setPosition({ left, top, width });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!anchorRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        anchorRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span
      className={cn("inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={anchorRef}
        type="button"
        className="inline-flex h-7 w-7 touch-manipulation items-center justify-center rounded-full border border-white/12 bg-white/[0.07] text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-white/20 hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ld-color-accent)]/70"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none fixed z-[220] rounded-[18px] border border-white/14 bg-[#081224]/[0.98] px-3.5 py-3 text-left text-xs leading-5 text-white/78 shadow-[0_20px_56px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl"
              style={
                position
                  ? { left: position.left, top: position.top, width: position.width }
                  : { opacity: 0 }
              }
            >
              {label}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
