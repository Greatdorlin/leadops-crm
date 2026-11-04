"use client";

import type { ReactNode, RefObject } from "react";
import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState } from "react";
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
  desktopMaxHeight = 440,
  desktopWidth = 320,
  onClose,
  open,
  scrollable = false,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  desktopMaxHeight?: number;
  desktopWidth?: number;
  onClose: () => void;
  open: boolean;
  scrollable?: boolean;
}) {
  const popoverId = useId();
  const dismiss = useEffectEvent(() => onClose());
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
      const margin = 12;
      const gap = 8;
      const panelHeight = panelRef.current?.offsetHeight ?? 360;
      const width = Math.min(
        Math.max(rect.width, desktopWidth),
        viewportWidth - margin * 2,
      );
      const left = clamp(rect.left, margin, viewportWidth - width - margin);
      const anchorBottom = clamp(rect.bottom, margin, viewportHeight - margin);
      const anchorTop = clamp(rect.top, margin, viewportHeight - margin);
      const spaceBelow = viewportHeight - anchorBottom - margin - gap;
      const spaceAbove = anchorTop - margin - gap;
      const placeBelow = spaceBelow >= Math.min(panelHeight, 280) || spaceBelow >= spaceAbove;
      const availableHeight = Math.max(180, placeBelow ? spaceBelow : spaceAbove);
      const maxHeight = Math.min(desktopMaxHeight, availableHeight);
      const renderedHeight = Math.min(panelHeight, maxHeight);
      const top = placeBelow
        ? anchorBottom + gap
        : Math.max(margin, anchorTop - gap - renderedHeight);

      setPosition({ left, maxHeight, top, width });
    }

    function schedulePositionUpdate(event?: Event) {
      if (event?.target instanceof Node && panelRef.current?.contains(event.target)) return;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = requestAnimationFrame(updatePosition);
    }

    updatePosition();
    const observer = new ResizeObserver(() => schedulePositionUpdate());
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
  }, [anchorRef, desktopMaxHeight, desktopWidth, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let outsidePress: { id: number; x: number; y: number } | null = null;

    function isOutside(target: EventTarget | null) {
      if (!(target instanceof Node)) return false;
      const targetPanel = target instanceof Element
        ? target.closest<HTMLElement>("[data-responsive-popover-id]")
        : null;
      return !panelRef.current?.contains(target)
        && !anchorRef.current?.contains(target)
        && !(targetPanel && isDescendantPopover(targetPanel, popoverId));
    }

    function handlePointerDown(event: PointerEvent) {
      outsidePress = event.isPrimary && event.button === 0 && isOutside(event.target)
        ? { id: event.pointerId, x: event.clientX, y: event.clientY }
        : null;
    }

    function handlePointerMove(event: PointerEvent) {
      if (outsidePress?.id === event.pointerId &&
          Math.hypot(event.clientX - outsidePress.x, event.clientY - outsidePress.y) > 8) {
        outsidePress = null;
      }
    }

    function handlePointerUp(event: PointerEvent) {
      const press = outsidePress;
      outsidePress = null;
      if (press?.id !== event.pointerId || !isOutside(event.target)) return;
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 8) dismiss();
    }

    function clearOutsidePress() {
      outsidePress = null;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const panel = panelRef.current;
      const openPanels = getOpenPopoverPanels();
      if (!panel || openPanels.at(-1) !== panel) return;

      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
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

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("pointerup", handlePointerUp, true);
    document.addEventListener("pointercancel", clearOutsidePress, true);
    document.addEventListener("scroll", clearOutsidePress, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("pointercancel", clearOutsidePress, true);
      document.removeEventListener("scroll", clearOutsidePress, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, isMobile, open, popoverId]);

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

  usePreservedBodyScrollLock(open && isMobile);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      {isMobile ? (
        <div
          className="fixed inset-0 z-[200] bg-black/50"
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
          "fixed z-[210] flex min-h-0 flex-col border border-white/12 bg-[#171922] shadow-xl",
          scrollable ? "overflow-x-hidden overflow-y-auto" : "overflow-hidden",
          isMobile
            ? "inset-x-2.5 bottom-[max(0.625rem,env(safe-area-inset-bottom))] max-h-[min(86dvh,680px)] max-w-[calc(100vw-1.25rem)] rounded-2xl p-2"
            : "rounded-xl p-2",
          className,
        )}
        style={isMobile ? undefined : position ?? { visibility: "hidden" }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
