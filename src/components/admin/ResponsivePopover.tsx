"use client";

import type { ReactNode, RefObject } from "react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { usePreservedBodyScrollLock } from "./AdminOverlayPortal";

interface PopoverPosition {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getOpenPopoverPanels() {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-responsive-popover-id]"),
  );
}

function isDescendantPopover(panel: HTMLElement, ancestorId: string) {
  const panels = getOpenPopoverPanels();
  const visited = new Set<string>();
  let parentId = panel.dataset.responsivePopoverParentId;

  while (parentId && !visited.has(parentId)) {
    if (parentId === ancestorId) return true;
    visited.add(parentId);
    parentId = panels.find(
      (candidate) => candidate.dataset.responsivePopoverId === parentId,
    )?.dataset.responsivePopoverParentId;
  }

  return false;
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
  const popoverId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [parentPopoverId, setParentPopoverId] = useState<string | undefined>();
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

      setParentPopoverId(
        anchor.closest<HTMLElement>("[data-responsive-popover-id]")
          ?.dataset.responsivePopoverId,
      );

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
      const targetPanel = target instanceof Element
        ? target.closest<HTMLElement>("[data-responsive-popover-id]")
        : null;
      if (
        panelRef.current?.contains(target) ||
        anchorRef.current?.contains(target) ||
        (targetPanel && isDescendantPopover(targetPanel, popoverId))
      ) {
        return;
      }
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      const panel = panelRef.current;
      const openPanels = getOpenPopoverPanels();
      if (!panel || openPanels.at(-1) !== panel) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        anchorRef.current?.focus({ preventScroll: true });
        return;
      }

      if (event.key === "Tab" && isMobile) {
        const focusable = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        if (focusable.length === 0) {
          event.preventDefault();
          panel.focus({ preventScroll: true });
          return;
        }

        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus({ preventScroll: true });
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, isMobile, onClose, open, popoverId]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const preferredTarget = panel.querySelector<HTMLElement>(
        '[data-popover-autofocus="true"]',
      );
      const activeElement = document.activeElement;
      if (
        preferredTarget &&
        (activeElement === anchorRef.current || activeElement === document.body)
      ) {
        preferredTarget.focus({ preventScroll: true });
      } else if (isMobile && activeElement === anchorRef.current) {
        panel.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [anchorRef, isMobile, open]);

  usePreservedBodyScrollLock(open);

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
        aria-modal={isMobile || undefined}
        data-responsive-popover="true"
        data-responsive-popover-id={popoverId}
        data-responsive-popover-parent-id={parentPopoverId}
        tabIndex={-1}
        className={cn(
          "ld-glass-panel fixed z-[150] flex min-h-0 flex-col overflow-hidden border border-white/14 bg-[#070b18]/[0.97] shadow-[0_28px_90px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.11)]",
          isMobile
            ? "inset-x-2.5 bottom-[max(0.625rem,env(safe-area-inset-bottom))] max-h-[min(86dvh,680px)] max-w-[calc(100vw-1.25rem)] rounded-[26px] p-2.5"
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
