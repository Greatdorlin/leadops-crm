"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { ResolvedWorkspaceSettings } from "@/lib/crm/workspace-settings";
import { buildThemeCssVariables } from "@/lib/crm/workspace-settings";

const AdminWorkspaceSettingsContext = createContext<ResolvedWorkspaceSettings | null>(null);

export function AdminWorkspaceSettingsProvider({
  initialSettings,
  children,
}: {
  initialSettings: ResolvedWorkspaceSettings;
  children: ReactNode;
}) {
  const value = useMemo(() => initialSettings, [initialSettings]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const variables = buildThemeCssVariables(value);
    const previousValues = new Map<string, string>();

    for (const [key, nextValue] of Object.entries(variables)) {
      previousValues.set(key, root.style.getPropertyValue(key));
      root.style.setProperty(key, nextValue);
    }

    const faviconHref = value.faviconUrl;
    let cleanupHref: string | null = null;
    let linkElement = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (faviconHref) {
      if (!linkElement) {
        linkElement = document.createElement("link");
        linkElement.rel = "icon";
        document.head.appendChild(linkElement);
        cleanupHref = "";
      }

      cleanupHref = linkElement.href;
      linkElement.href = faviconHref;
    }

    return () => {
      for (const [key, previousValue] of previousValues.entries()) {
        if (previousValue) {
          root.style.setProperty(key, previousValue);
        } else {
          root.style.removeProperty(key);
        }
      }

      if (linkElement && faviconHref) {
        if (cleanupHref) {
          linkElement.href = cleanupHref;
        } else {
          linkElement.remove();
        }
      }
    };
  }, [value]);

  return (
    <AdminWorkspaceSettingsContext.Provider value={value}>
      {children}
    </AdminWorkspaceSettingsContext.Provider>
  );
}

export function useAdminWorkspaceSettings() {
  const context = useContext(AdminWorkspaceSettingsContext);
  if (!context) {
    throw new Error("Admin workspace settings are not available in this tree.");
  }

  return context;
}
