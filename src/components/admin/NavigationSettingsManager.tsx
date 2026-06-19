"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MoveDown, MoveUp, RotateCcw } from "lucide-react";
import type { NavigationItemKey, ResolvedWorkspaceSettings } from "@/lib/crm/workspace-settings";
import { NAVIGATION_ITEM_KEYS } from "@/lib/crm/workspace-settings";

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
}: {
  initialSettings: ResolvedWorkspaceSettings;
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
    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-5">
      <div className="grid gap-3">
        {orderedItems.map((item, index) => (
          <div key={item.key} className="admin-surface-muted rounded-[24px] p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_auto] lg:items-center">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.key.replace(/_/g, " ")}</p>
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
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
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
                  className="h-4 w-4 rounded border-slate-300"
                />
                {lockedKeys.has(item.key) ? "Always visible" : "Visible"}
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

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setItems(normalizeItems(initialSettings))}
          className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to default
        </button>
        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={isSaving}
          className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
        >
          {isSaving ? "Saving..." : "Save navigation"}
        </button>
      </div>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
