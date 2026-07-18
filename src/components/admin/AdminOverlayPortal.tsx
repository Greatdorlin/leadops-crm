"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
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

export function AdminOverlayPortal({ children }: { children: ReactNode }) {
  usePreservedBodyScrollLock(true);

  return typeof document === "undefined" ? null : createPortal(children, document.body);
}
