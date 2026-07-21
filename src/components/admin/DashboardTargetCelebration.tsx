"use client";

import { useEffect, useState } from "react";
import { CelebrationPanel } from "@/components/admin/CelebrationPanel";
import { useAdminWorkspaceSettings } from "@/components/admin/AdminWorkspaceSettingsProvider";
import { buildTargetCelebration } from "@/lib/crm/celebrations";

export function DashboardTargetCelebration({
  target,
}: {
  target:
    | {
        id: string;
        name: string;
        progressPercent: number;
        wonValueLabel: string;
      }
    | null;
}) {
  const settings = useAdminWorkspaceSettings();
  const [activeTargetKey, setActiveTargetKey] = useState<string | null>(null);

  useEffect(() => {
    if (!target || !settings.celebrationsEnabled || !settings.targetCelebrationsEnabled) {
      return;
    }

    if (target.progressPercent < 100) {
      return;
    }

    const storageKey = `leads-desk:target-celebration:${target.id}`;
    if (window.localStorage.getItem(storageKey) === "seen") {
      return;
    }

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, "seen");
      setActiveTargetKey(storageKey);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [settings.celebrationsEnabled, settings.targetCelebrationsEnabled, target]);

  const celebration = activeTargetKey && target
    ? buildTargetCelebration({
        targetName: target.name,
        progressPercent: target.progressPercent,
        wonValueLabel: target.wonValueLabel,
      })
    : null;

  return (
    <CelebrationPanel
      celebration={celebration}
      onClose={() => setActiveTargetKey(null)}
      className="mb-6"
      autoHideMs={7000}
      styleMode={settings.celebrationStyle}
    />
  );
}
