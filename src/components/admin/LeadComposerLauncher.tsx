"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  WORKSPACE_COMPOSER_OPEN_EVENT,
  type WorkspaceComposerMode,
} from "@/lib/crm/workspace-composer";

export function LeadComposerLauncher({
  mode,
  children,
  variant = "primary",
  className,
}: {
  mode: Extract<WorkspaceComposerMode, "lead" | "import">;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  function openComposer() {
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_COMPOSER_OPEN_EVENT, { detail: { mode } }),
    );
    window.requestAnimationFrame(() => {
      const target = document.getElementById("lead-action-center");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      target?.focus({ preventScroll: true });
    });
  }

  return (
    <button
      type="button"
      onClick={openComposer}
      className={cn(
        variant === "primary" ? "admin-button-primary" : "admin-button-secondary",
        "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold",
        className,
      )}
    >
      {children}
    </button>
  );
}
