"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export function usePreservedBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }

    const scrollY = window.scrollY;
    const previous = {
      left: document.body.style.left,
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      right: document.body.style.right,
      top: document.body.style.top,
      width: document.body.style.width,
    };

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.left = previous.left;
      document.body.style.right = previous.right;
      document.body.style.width = previous.width;
      document.body.style.overflow = previous.overflow;
      window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
    };
  }, [active]);
}

export function AdminOverlayPortal({ children }: { children: ReactNode }) {
  usePreservedBodyScrollLock(true);

  return typeof document === "undefined" ? null : createPortal(children, document.body);
}
