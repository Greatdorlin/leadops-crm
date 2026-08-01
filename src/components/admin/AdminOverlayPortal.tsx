"use client";

import type { ReactNode } from "react";
import { useEffect, useEffectEvent, useRef } from "react";
import { createPortal } from "react-dom";

type PreservedBodyStyles = {
  left: string;
  overflow: string;
  position: string;
  right: string;
  top: string;
  width: string;
};

let bodyScrollLockCount = 0;
let preservedBodyStyles: PreservedBodyStyles | null = null;
let preservedScrollY = 0;

function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    preservedScrollY = window.scrollY;
    preservedBodyStyles = {
      left: document.body.style.left,
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      right: document.body.style.right,
      top: document.body.style.top,
      width: document.body.style.width,
    };

    document.body.style.position = "fixed";
    document.body.style.top = `-${preservedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
  }

  bodyScrollLockCount += 1;
}

function unlockBodyScroll() {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
  if (bodyScrollLockCount > 0 || !preservedBodyStyles) {
    return;
  }

  document.body.style.position = preservedBodyStyles.position;
  document.body.style.top = preservedBodyStyles.top;
  document.body.style.left = preservedBodyStyles.left;
  document.body.style.right = preservedBodyStyles.right;
  document.body.style.width = preservedBodyStyles.width;
  document.body.style.overflow = preservedBodyStyles.overflow;
  preservedBodyStyles = null;
  window.scrollTo({ top: preservedScrollY, left: 0, behavior: "instant" });
}

export function usePreservedBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }

    lockBodyScroll();
    return unlockBodyScroll;
  }, [active]);
}

function getFocusableElements(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.getClientRects().length > 0);
}

export function AdminOverlayPortal({
  children,
  onClose,
  open = true,
}: {
  children: ReactNode;
  onClose?: () => void;
  open?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeOverlay = useEffectEvent(() => onClose?.());
  usePreservedBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const preferred =
        root.querySelector<HTMLElement>('[data-overlay-autofocus="true"]') ??
        getFocusableElements(root)[0] ??
        root.querySelector<HTMLElement>('[role="dialog"]');
      preferred?.focus({ preventScroll: true });
    });

    function handleKeyDown(event: KeyboardEvent) {
      const root = rootRef.current;
      const overlays = Array.from(
        document.querySelectorAll<HTMLElement>("[data-admin-overlay='true']"),
      );
      if (!root || overlays.at(-1) !== root) return;
      const openPopover = Array.from(
        document.querySelectorAll<HTMLElement>("[data-responsive-popover-id]"),
      ).at(-1);
      if (openPopover && !root.contains(openPopover)) {
        return;
      }

      if (event.key === "Escape" && onClose) {
        event.preventDefault();
        closeOverlay();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(root);
      if (focusable.length === 0) {
        event.preventDefault();
        root.focus({ preventScroll: true });
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

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      requestAnimationFrame(() => {
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      });
    };
  }, [open, onClose]);

  return !open || typeof document === "undefined"
    ? null
    : createPortal(
        <div
          ref={rootRef}
          data-admin-overlay="true"
          className="contents"
          tabIndex={-1}
        >
          {children}
        </div>,
        document.body,
      );
}
