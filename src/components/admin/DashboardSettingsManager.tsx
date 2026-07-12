"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MoveDown, MoveUp, RotateCcw } from "lucide-react";
import type { ResolvedWorkspaceSettings } from "@/lib/crm/workspace-settings";
import {
  DEFAULT_DASHBOARD_CONFIG,
  type DashboardWidgetKey,
} from "@/lib/crm/workspace-settings";
import { GlassSurface, SectionHeader, SmoothButton } from "@/components/admin/ui";

const widgetLabels: Record<DashboardWidgetKey, string> = {
  total_leads: "Total Leads",
  new_leads: "New Leads",
  leads_this_month: "Leads This Month",
  overdue_follow_ups: "Overdue Follow-ups",
  pipeline_value: "Pipeline Value",
  won_value: "Won Value",
  conversion_rate: "Conversion Rate",
  top_sources: "Top Sources",
  recent_intake: "Recent Intake",
  team_performance: "Team Performance",
  target_progress: "Target Progress",
  pipeline_overview: "Pipeline Overview",
  my_tasks: "My Tasks",
  lead_trend: "Lead and Revenue Trend",
  recent_leads: "Recent Leads",
  quick_actions: "Quick Actions",
};

export function DashboardSettingsManager({
  initialSettings,
}: {
  initialSettings: ResolvedWorkspaceSettings;
}) {
  const router = useRouter();
  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetKey[]>(initialSettings.dashboard.widgetOrder);
  const [hiddenWidgets, setHiddenWidgets] = useState<DashboardWidgetKey[]>(initialSettings.dashboard.hiddenWidgets);
  const [defaultPeriod, setDefaultPeriod] = useState(initialSettings.dashboard.defaultPeriod);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function saveSettings() {
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetOrder, hiddenWidgets, defaultPeriod }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save dashboard settings right now.");
        setIsSaving(false);
        return;
      }

      setMessage("Dashboard updated.");
      setIsSaving(false);
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't save dashboard settings right now.");
      setIsSaving(false);
    }
  }

  function moveItem(key: DashboardWidgetKey, direction: -1 | 1) {
    setWidgetOrder((current) => {
      const next = [...current];
      const index = next.indexOf(key);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function toggleHidden(key: DashboardWidgetKey) {
    setHiddenWidgets((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  return (
    <GlassSurface intensity="medium" className="space-y-5 p-5 ld-animate-fade-in-up">
      <SectionHeader
        eyebrow="Dashboard layout"
        title="Choose what leaders see first"
        actions={
          <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-white/70">
            {widgetOrder.length - hiddenWidgets.length} visible
          </span>
        }
      />
      <div className="space-y-3">
        {widgetOrder.map((key, index) => (
          <div key={key} className="admin-surface-soft rounded-[24px] p-4 ld-animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center">
              <div>
                <p className="text-base font-semibold text-white">{widgetLabels[key]}</p>
                <p className="mt-1 text-sm text-white/70">Widget order #{index + 1}</p>
              </div>
              <label className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-semibold text-white/70">
                <span className="inline-flex items-center gap-2">
                  {hiddenWidgets.includes(key) ? <EyeOff className="h-4 w-4 text-white/70" /> : <Eye className="h-4 w-4 text-white/70" />}
                  Show widget
                </span>
                <input
                  type="checkbox"
                  checked={!hiddenWidgets.includes(key)}
                  onChange={() => toggleHidden(key)}
                  className="admin-toggle"
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => moveItem(key, -1)}
                  disabled={index === 0}
                  className="admin-icon-button disabled:opacity-40"
                >
                  <MoveUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(key, 1)}
                  disabled={index === widgetOrder.length - 1}
                  className="admin-icon-button disabled:opacity-40"
                >
                  <MoveDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Default period</span>
        <select
          value={defaultPeriod}
          onChange={(event) => setDefaultPeriod(event.target.value as typeof defaultPeriod)}
          className="admin-select h-11 w-full rounded-2xl px-4 text-sm outline-none"
        >
          <option value="30d">Last 30 days</option>
          <option value="this_month">This month</option>
          <option value="quarter">This quarter</option>
        </select>
      </label>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <SmoothButton
          variant="secondary"
          size="md"
          icon={<RotateCcw className="h-4 w-4" />}
          onClick={() => {
            setWidgetOrder([...DEFAULT_DASHBOARD_CONFIG.widgetOrder]);
            setHiddenWidgets([]);
            setDefaultPeriod(DEFAULT_DASHBOARD_CONFIG.defaultPeriod);
          }}
        >
          Reset dashboard
        </SmoothButton>
        <SmoothButton
          variant="primary"
          size="md"
          loading={isSaving}
          onClick={() => void saveSettings()}
        >
          {isSaving ? "Saving..." : "Save dashboard"}
        </SmoothButton>
      </div>
      {message ? <p className="text-sm text-white/70">{message}</p> : null}
    </GlassSurface>
  );
}
