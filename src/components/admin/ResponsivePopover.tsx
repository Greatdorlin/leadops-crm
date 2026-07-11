"use client";

import type { ReactNode, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

interface PopoverPosition {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function ResponsivePopover({
  anchorRef,
  ariaLabel,
  children,
  className,
  desktopWidth = 320,
  onClose,
  open,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  desktopWidth?: number;
  onClose: () => void;
  open: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) {
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const mobile = viewportWidth < 640;
      setIsMobile(mobile);

      if (mobile) {
        setPosition(null);
        return;
      }

      const rect = anchor.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewportHeight) {
        onClose();
        return;
      }

      const margin = 12;
      const gap = 8;
      const panelHeight = panelRef.current?.offsetHeight ?? 360;
      const width = Math.min(
        Math.max(rect.width, desktopWidth),
        viewportWidth - margin * 2,
      );
      const left = clamp(rect.left, margin, viewportWidth - width - margin);
      const spaceBelow = viewportHeight - rect.bottom - margin - gap;
      const spaceAbove = rect.top - margin - gap;
      const placeBelow = spaceBelow >= Math.min(panelHeight, 280) || spaceBelow >= spaceAbove;
      const availableHeight = Math.max(180, placeBelow ? spaceBelow : spaceAbove);
      const maxHeight = Math.min(440, availableHeight);
      const renderedHeight = Math.min(panelHeight, maxHeight);
      const top = placeBelow
        ? rect.bottom + gap
        : Math.max(margin, rect.top - gap - renderedHeight);

      setPosition({ left, maxHeight, top, width });
    }

    function schedulePositionUpdate() {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = requestAnimationFrame(updatePosition);
    }

    updatePosition();
    const observer = new ResizeObserver(schedulePositionUpdate);
    if (panelRef.current) {
      observer.observe(panelRef.current);
    }
    window.addEventListener("resize", schedulePositionUpdate);
    window.addEventListener("scroll", schedulePositionUpdate, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedulePositionUpdate);
      window.removeEventListener("scroll", schedulePositionUpdate, true);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [anchorRef, desktopWidth, onClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !anchorRef.current?.contains(target)
      ) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        anchorRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, onClose, open]);

  useEffect(() => {
    if (!open || !isMobile) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      {isMobile ? (
        <div
          className="fixed inset-0 z-[140] bg-[#02040c]/64 backdrop-blur-[3px]"
          aria-hidden="true"
        />
      ) : null}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={ariaLabel}
        className={cn(
          "ld-glass-panel fixed z-[150] flex min-h-0 flex-col overflow-hidden border border-white/14 bg-[#070b18]/[0.97] shadow-[0_28px_90px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.11)]",
          isMobile
            ? "inset-x-3 bottom-3 max-h-[min(82dvh,620px)] rounded-[28px] p-2.5"
            : "rounded-[24px] p-2.5",
          className,
        )}
        style={
          isMobile
            ? {
                backgroundColor: "rgba(7, 11, 24, 0.97)",
                backdropFilter: "blur(26px) saturate(155%)",
              }
            : position
              ? {
                  backgroundColor: "rgba(7, 11, 24, 0.97)",
                  backdropFilter: "blur(26px) saturate(155%)",
                  left: position.left,
                  maxHeight: position.maxHeight,
                  top: position.top,
                  width: position.width,
                }
              : {
                  backgroundColor: "rgba(7, 11, 24, 0.97)",
                  backdropFilter: "blur(26px) saturate(155%)",
                  opacity: 0,
                  pointerEvents: "none",
                }
        }
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
