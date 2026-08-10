"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function AdminPickerHeader({
  description,
  onClose,
  title,
}: {
  description?: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 px-2 pb-2 pt-1">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        {description ? <p className="mt-0.5 text-xs leading-5 text-white/60">{description}</p> : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="ld-focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition hover:border-white/18 hover:bg-white/[0.1] hover:text-white"
        aria-label={`Close ${title.toLowerCase()}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AdminPickerScrollArea({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  function updateScrollAffordance() {
    const region = scrollRef.current;
    if (!region) return;
    setCanScrollUp(region.scrollTop > 6);
    setCanScrollDown(region.scrollTop + region.clientHeight < region.scrollHeight - 6);
  }

  useEffect(() => {
    const region = scrollRef.current;
    if (!region) return;
    const frame = requestAnimationFrame(updateScrollAffordance);
    const observer = new ResizeObserver(updateScrollAffordance);
    observer.observe(region);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [children]);

  function scroll(direction: -1 | 1) {
    const region = scrollRef.current;
    if (!region) return;
    region.scrollBy({
      behavior: "smooth",
      top: direction * Math.max(144, region.clientHeight * 0.62),
    });
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[18px]">
      {canScrollUp ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-12 items-start justify-center bg-gradient-to-b from-[#070b18] via-[#070b18]/92 to-transparent pt-1">
          <button type="button" onClick={() => scroll(-1)} className="ld-focus-ring pointer-events-auto inline-flex h-7 w-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.09] text-white/72 shadow-lg backdrop-blur-xl transition hover:bg-white/[0.14] hover:text-white" aria-label="Scroll to earlier options">
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div
        {...props}
        ref={scrollRef}
        onScroll={(event) => {
          updateScrollAffordance();
          props.onScroll?.(event);
        }}
        className={cn("ld-popover-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}
      >
        {children}
      </div>
      {canScrollDown ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-12 items-end justify-center bg-gradient-to-t from-[#070b18] via-[#070b18]/92 to-transparent pb-1">
          <button type="button" onClick={() => scroll(1)} className="ld-focus-ring pointer-events-auto inline-flex h-7 w-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.09] text-white/72 shadow-lg backdrop-blur-xl transition hover:bg-white/[0.14] hover:text-white" aria-label="Scroll to more options">
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
