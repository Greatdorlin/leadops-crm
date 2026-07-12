"use client";

import { Check, RotateCcw, Save, X } from "lucide-react";
import { useState } from "react";
import {
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSION_ROLES,
  type PermissionKey,
} from "@/lib/crm/role-permissions-contract";
import type { CrmUserRole } from "@/lib/crm/types";
import { cn } from "@/lib/cn";
import { GlassCard } from "./GlassCard";
import { InfoTip } from "./ui/InfoTip";
import { SmoothButton } from "./ui/SmoothButton";

const ROLE_LABELS: Record<CrmUserRole, string> = {
  admin: "Owner",
  manager: "Manager",
  ad_manager: "Ads",
  consultant: "Team lead",
  finance: "Finance",
  affiliate: "Affiliate",
  sales_agent: "Sales rep",
};

export interface RolePermissionViewRow {
  id: string;
  role: CrmUserRole;
  permission: PermissionKey;
  enabled: boolean;
}

export function RolePermissionsManager({
  initialPermissions,
  demoMode = false,
}: {
  initialPermissions: RolePermissionViewRow[];
  demoMode?: boolean;
}) {
  const [permissions, setPermissions] = useState(initialPermissions);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const groupedByCategory = PERMISSION_DEFINITIONS.reduce<
    Record<string, Array<(typeof PERMISSION_DEFINITIONS)[number]>>
  >((groups, permission) => {
    (groups[permission.category] ??= []).push(permission);
    return groups;
  }, {});

  function showToast(message: string, error = false) {
    setToast({ message, error });
    window.setTimeout(() => setToast(null), 2800);
  }

  function isEnabled(role: CrmUserRole, permission: PermissionKey) {
    return permissions.find(
      (row) => row.role === role && row.permission === permission,
    )?.enabled ?? false;
  }

  async function togglePermission(
    role: CrmUserRole,
    permission: PermissionKey,
    current: boolean,
  ) {
    const key = `${role}:${permission}`;
    if (demoMode) {
      setPermissions((rows) => rows.map((row) => row.role === role && row.permission === permission ? { ...row, enabled: !current } : row));
      showToast(`${ROLE_LABELS[role]} access updated for this preview.`);
      return;
    }
    setSaving((state) => ({ ...state, [key]: true }));

    try {
      const response = await fetch("/api/admin/role-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, permission, enabled: !current }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        showToast(payload?.error ?? "Permission could not be updated.", true);
        return;
      }

      setPermissions((rows) =>
        rows.map((row) =>
          row.role === role && row.permission === permission
            ? { ...row, enabled: !current }
            : row,
        ),
      );
      showToast(`${ROLE_LABELS[role]} access updated.`);
    } catch {
      showToast("Permission could not be updated.", true);
    } finally {
      setSaving((state) => ({ ...state, [key]: false }));
    }
  }

  async function resetPermissions() {
    if (!window.confirm("Reset every role to the Leads Desk defaults?")) {
      return;
    }

    if (demoMode) {
      setPermissions(initialPermissions);
      showToast("Role defaults restored for this preview.");
      return;
    }

    setResetting(true);
    try {
      const response = await fetch("/api/admin/role-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        permissions?: RolePermissionViewRow[];
      } | null;
      if (!response.ok || !payload?.permissions) {
        showToast(payload?.error ?? "Permissions could not be reset.", true);
        return;
      }

      setPermissions(payload.permissions);
      showToast("Role defaults restored.");
    } catch {
      showToast("Permissions could not be reset.", true);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      <GlassCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-2.5">
          <p className="text-sm font-semibold text-white">Changes save immediately</p>
          <InfoTip label="Permissions apply to every active user with that role. Individual account access can still be deactivated in Team settings." />
        </div>
        <SmoothButton
          variant="secondary"
          onClick={() => void resetPermissions()}
          disabled={resetting}
          icon={<RotateCcw className="h-4 w-4" />}
        >
          {resetting ? "Resetting..." : "Reset defaults"}
        </SmoothButton>
      </GlassCard>

      {Object.entries(groupedByCategory).map(([category, definitions]) => (
        <GlassCard key={category} className="overflow-hidden">
          <div className="border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/72">
              {category}
            </h2>
          </div>
          <div className="ld-scroll-region overflow-x-auto">
            <table className="min-w-[860px] w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-white/58">
                  <th className="sticky left-0 z-20 min-w-[220px] border-b border-white/[0.07] bg-[#080a14] px-4 py-3 text-left text-xs font-semibold sm:px-5">
                    Permission
                  </th>
                  {ROLE_PERMISSION_ROLES.map((role) => (
                    <th key={role} className="min-w-[92px] border-b border-white/[0.07] px-2 py-3 text-center text-xs font-semibold">
                      {ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(definitions ?? []).map((definition) => (
                  <tr key={definition.key} className="group transition hover:bg-white/[0.035]">
                    <td className="sticky left-0 z-10 border-b border-white/[0.055] bg-[#080a14] px-4 py-3 sm:px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white/86">{definition.label}</span>
                        <InfoTip label={definition.description} align="left" className="scale-90" />
                      </div>
                    </td>
                    {ROLE_PERMISSION_ROLES.map((role) => {
                      const enabled = isEnabled(role, definition.key);
                      const key = `${role}:${definition.key}`;
                      const isSaving = saving[key];
                      const locked = role === "admin";
                      return (
                        <td key={role} className="border-b border-white/[0.055] px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => void togglePermission(role, definition.key, enabled)}
                            disabled={locked || isSaving}
                            className={cn(
                              "ld-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
                              enabled
                                ? "border-emerald-300/24 bg-emerald-400/14 text-emerald-200"
                                : "border-white/10 bg-white/[0.045] text-white/34 hover:bg-white/[0.08] hover:text-white/70",
                              locked && "cursor-not-allowed opacity-58",
                            )}
                            aria-label={`${enabled ? "Disable" : "Enable"} ${definition.label} for ${ROLE_LABELS[role]}`}
                            aria-pressed={enabled}
                            title={locked ? "Owner access stays enabled." : undefined}
                          >
                            {isSaving ? (
                              <Save className="h-4 w-4 animate-pulse" />
                            ) : enabled ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      ))}

      {toast ? (
        <div
          className={cn(
            "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[230] -translate-x-1/2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:left-auto sm:right-5 sm:translate-x-0",
            toast.error
              ? "border-rose-300/24 bg-rose-500/18 text-rose-100"
              : "border-emerald-300/24 bg-emerald-500/18 text-emerald-100",
          )}
          role={toast.error ? "alert" : "status"}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
