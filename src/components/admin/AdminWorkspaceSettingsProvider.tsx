"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { ResolvedWorkspaceSettings } from "@/lib/crm/workspace-settings";
import { buildThemeCssVariables } from "@/lib/crm/workspace-settings";

const AdminWorkspaceSettingsContext =
  createContext<ResolvedWorkspaceSettings | null>(null);

export function AdminWorkspaceSettingsProvider({
  initialSettings,
  children,
}: {
  initialSettings: ResolvedWorkspaceSettings;
  children: ReactNode;
}) {
  const [settingsState, setSettingsState] = useState({ source: initialSettings, value: initialSettings });
  if (settingsState.source !== initialSettings) {
    setSettingsState({ source: initialSettings, value: initialSettings });
  }
  const value = settingsState.source === initialSettings ? settingsState.value : initialSettings;
  const current = useRef(value);
  const router = useRouter();
  useEffect(() => {
    current.current = value;
  }, [value]);
  useEffect(() => {
    let active = true;
    let pending = false;
    async function refresh() {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const response = await fetch("/api/admin/settings/appearance", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const next = (await response.json())
          .settings as ResolvedWorkspaceSettings;
        if (
          active &&
          next &&
          typeof next.globalCurrency === "string" &&
          JSON.stringify(next) !== JSON.stringify(current.current)
        ) {
          current.current = next;
          setSettingsState((state) => ({ ...state, value: next }));
          router.refresh();
        }
      } catch {
        /* Keep the last known settings on a transient network failure. */
      } finally {
        pending = false;
      }
    }
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("leads-desk-settings")
        : null;
    channel?.addEventListener("message", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("workspace:settings-saved", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      channel?.close();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("workspace:settings-saved", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

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
    let linkElement = document.querySelector(
      "link[rel='icon']",
    ) as HTMLLinkElement | null;
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
