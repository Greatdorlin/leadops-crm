'use client';

import { cn } from "@/lib/cn";
import { useEffect } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface MobileSidebarDrawerProps
  extends ComponentPropsWithoutRef<"div"> {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function MobileSidebarDrawer({
  isOpen,
  onClose,
  children,
  title,
  className,
  ...props
}: MobileSidebarDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Drawer */}
      <div
        {...props}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(20rem,88vw)] max-w-none flex-col md:hidden",
          "ld-glass-sidebar ld-animate-slide-in-right",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1.02)]",
          "touch-44",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <h2 className="text-base font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="touch-48 ld-focus-ring inline-flex items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </>
  );
}
