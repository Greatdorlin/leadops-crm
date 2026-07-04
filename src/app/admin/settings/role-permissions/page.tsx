"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, RotateCcw, Save, Check, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { GlassCard } from "@/components/admin/GlassCard";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { GradientText } from "@/components/admin/ui/GradientText";
import { PERMISSION_DEFINITIONS } from "@/lib/crm/role-permissions";
import type { PermissionKey } from "@/lib/crm/role-permissions";
import type { CrmUserRole } from "@/lib/crm/types";

const ROLE_LABELS: Record<CrmUserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  ad_manager: "Ad Manager",
  consultant: "Consultant",
  finance: "Finance",
  affiliate: "Affiliate",
  sales_agent: "Sales Agent",
};

const ROLE_ORDER: CrmUserRole[] = ["admin", "manager", "ad_manager", "consultant", "finance", "affiliate", "sales_agent"];

interface PermissionRow {
  id: string;
  role: CrmUserRole;
  permission: PermissionKey;
  enabled: boolean;
}

export default function RolePermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  async function loadPermissions() {
    try {
      const res = await fetch("/api/admin/role-permissions");
      const data = await res.json();
      if (res.ok && data.permissions) {
        setPermissions(data.permissions);
      } else {
        showToast(data.error || "Failed to load permissions.", "error");
      }
    } catch {
      showToast("Network error loading permissions.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPermissions();
  }, []);

  async function togglePermission(role: CrmUserRole, permission: PermissionKey, current: boolean) {
    const key = `${role}-${permission}`;
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/admin/role-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, permission, enabled: !current }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPermissions((prev) =>
          prev.map((p) =>
            p.role === role && p.permission === permission ? { ...p, enabled: !current } : p
          )
        );
        showToast(`${ROLE_LABELS[role]} — ${permission}: ${!current ? "enabled" : "disabled"}`, "success");
      } else {
        showToast(data.error || "Failed to update.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleReset() {
    if (!confirm("Reset all permissions to system defaults? This will overwrite any custom changes.")) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/admin/role-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await loadPermissions();
        showToast("Permissions reset to defaults.", "success");
      } else {
        showToast(data.error || "Reset failed.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setResetting(false);
    }
  }

  const groupedByCategory = PERMISSION_DEFINITIONS.reduce((acc, def) => {
    if (!acc[def.category]) acc[def.category] = [];
    acc[def.category].push(def);
    return acc;
  }, {} as Record<string, typeof PERMISSION_DEFINITIONS[number][]>);

  const permissionState = (role: CrmUserRole, permission: PermissionKey) => {
    const row = permissions.find((p) => p.role === role && p.permission === permission);
    return row?.enabled ?? false;
  };

  return (
    <AdminShell activeNav="settings" title="Role Permissions" description="Turn permissions on or off for every role.">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              <GradientText>Role Permissions</GradientText>
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Fine-grained access control. Toggle any permission for any role.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SmoothButton
              variant="secondary"
              onClick={handleReset}
              disabled={resetting || loading}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {resetting ? "Resetting..." : "Reset to Defaults"}
            </SmoothButton>
          </div>
        </div>

        {loading ? (
          <GlassCard className="p-8 text-center">
            <div className="animate-pulse text-white/50">Loading permissions...</div>
          </GlassCard>
        ) : (
          Object.entries(groupedByCategory).map(([category, defs]) => (
            <GlassCard key={category} className="overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                  {category}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-5 py-3 text-left font-medium text-white/50 sticky left-0 bg-[#080A14]/90 backdrop-blur-sm">Permission</th>
                      {ROLE_ORDER.map((role) => (
                        <th key={role} className="px-3 py-3 text-center font-medium text-white/50 min-w-[100px]">
                          {ROLE_LABELS[role]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {defs.map((def) => (
                      <tr key={def.key} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                        <td className="px-5 py-3 sticky left-0 bg-[#080A14]/90 backdrop-blur-sm">
                          <div className="font-medium text-white/80">{def.label}</div>
                          <div className="text-xs text-white/40">{def.description}</div>
                        </td>
                        {ROLE_ORDER.map((role) => {
                          const enabled = permissionState(role, def.key);
                          const key = `${role}-${def.key}`;
                          const isSaving = saving[key];
                          return (
                            <td key={role} className="px-3 py-3 text-center">
                              <button
                                onClick={() => togglePermission(role, def.key, enabled)}
                                disabled={isSaving || role === "admin"}
                                title={role === "admin" ? "Admin always has all permissions by default" : undefined}
                                className={`
                                  inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all
                                  ${enabled
                                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                    : "bg-white/5 text-white/20 hover:bg-white/10"
                                  }
                                  ${role === "admin" ? "opacity-60 cursor-not-allowed" : ""}
                                  ${isSaving ? "opacity-50" : ""}
                                `}
                              >
                                {isSaving ? (
                                  <Save className="w-4 h-4 animate-pulse" />
                                ) : enabled ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <X className="w-4 h-4" />
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
          ))
        )}

        {toast && (
          <div
            className={`
              fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl backdrop-blur-xl border
              ${toast.type === "success" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-red-500/15 border-red-500/30 text-red-300"}
            `}
          >
            {toast.message}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
