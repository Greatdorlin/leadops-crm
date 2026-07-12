"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Lock, MoveDown, MoveUp, RotateCcw } from "lucide-react";
import type { NavigationItemKey, ResolvedWorkspaceSettings } from "@/lib/crm/workspace-settings";
import { NAVIGATION_ITEM_KEYS } from "@/lib/crm/workspace-settings";
import { GlassSurface, SectionHeader, SmoothButton } from "@/components/admin/ui";

type NavigationDraftItem = {
  key: NavigationItemKey;
  label: string;
  visible: boolean;
  order: number;
};

const lockedKeys = new Set<NavigationItemKey>(["dashboard", "leads", "settings"]);

function normalizeItems(settings: ResolvedWorkspaceSettings): NavigationDraftItem[] {
  return NAVIGATION_ITEM_KEYS.map((key, index) => {
    const current = settings.navigation.items.find((item) => item.key === key);
    return {
      key,
      label: current?.label?.trim() || key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      visible: current?.visible !== false,
      order: current?.order ?? index,
    };
  }).sort((left, right) => left.order - right.order);
}

export function NavigationSettingsManager({
  initialSettings,
  demoMode = false,
}: {
  initialSettings: ResolvedWorkspaceSettings;
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<NavigationDraftItem[]>(() => normalizeItems(initialSettings));
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const orderedItems = useMemo(
    () => [...items].sort((left, right) => left.order - right.order),
    [items],
  );

  async function saveSettings() {
    setIsSaving(true);
    setMessage("");
    if (demoMode) {
      setMessage("Navigation updated for this preview.");
      setIsSaving(false);
      return;
    }
    try {
      const response = await fetch("/api/admin/settings/navigation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderedItems.map((item, index) => ({
            key: item.key,
            label: item.label,
            visible: lockedKeys.has(item.key) ? true : item.visible,
            order: index,
          })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save navigation right now.");
        setIsSaving(false);
        return;
      }

      setMessage("Navigation updated.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't save navigation right now.");
      setIsSaving(false);
    }
  }

  function moveItem(key: NavigationItemKey, direction: -1 | 1) {
    setItems((current) => {
      const ordered = [...current].sort((left, right) => left.order - right.order);
      const index = ordered.findIndex((item) => item.key === key);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
        return current;
      }

      [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
      return ordered.map((item, nextIndex) => ({ ...item, order: nextIndex }));
    });
  }

  return (
    <GlassSurface intensity="medium" className="space-y-5 p-5 ld-animate-fade-in-up">
      <SectionHeader
        eyebrow="Workspace menu"
        title="Shape the sidebar without breaking access"
        actions={
          <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-white/70">
            Core items locked
          </span>
        }
      />
      <div className="grid gap-3">
        {orderedItems.map((item, index) => (
          <div key={item.key} className="admin-surface-soft rounded-[24px] p-4 ld-animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_auto] lg:items-center">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{item.key.replace(/_/g, " ")}</p>
                <input
                  type="text"
                  value={item.label}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((currentItem) =>
                        currentItem.key === item.key ? { ...currentItem, label: event.target.value } : currentItem,
                      ),
                    )
                  }
                  className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                />
              </div>
              <label className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-white/70">
                <span className="inline-flex items-center gap-2">
                  {lockedKeys.has(item.key) ? <Lock className="h-4 w-4 text-amber-200" /> : <Eye className="h-4 w-4 text-white/70" />}
                  {lockedKeys.has(item.key) ? "Always visible" : "Visible"}
                </span>
                <input
                  type="checkbox"
                  checked={lockedKeys.has(item.key) ? true : item.visible}
                  disabled={lockedKeys.has(item.key)}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((currentItem) =>
                        currentItem.key === item.key ? { ...currentItem, visible: event.target.checked } : currentItem,
                      ),
                    )
                  }
                  className="admin-toggle"
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => moveItem(item.key, -1)}
                  disabled={index === 0}
                  className="admin-icon-button disabled:opacity-40"
                  aria-label="Move earlier"
                >
                  <MoveUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(item.key, 1)}
                  disabled={index === orderedItems.length - 1}
                  className="admin-icon-button disabled:opacity-40"
                  aria-label="Move later"
                >
                  <MoveDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <SmoothButton
          variant="secondary"
          size="md"
          icon={<RotateCcw className="h-4 w-4" />}
          onClick={() => setItems(normalizeItems(initialSettings))}
        >
          Reset to default
        </SmoothButton>
        <SmoothButton
          variant="primary"
          size="md"
          loading={isSaving}
          onClick={() => void saveSettings()}
        >
          {isSaving ? "Saving..." : "Save navigation"}
        </SmoothButton>
      </div>
      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </GlassSurface>
  );
}
