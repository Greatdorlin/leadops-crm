"use client";

import { ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import {
  PERMISSION_DEFINITIONS,
  type PermissionKey,
} from "@/lib/crm/role-permissions-contract";
import { AdminOverlayPortal } from "./AdminOverlayPortal";

type PermissionOverride = {
  permission: PermissionKey;
  enabled: boolean;
};

export function UserPermissionOverridesManager({
  userId,
  userName,
  rolePermissions,
  initialOverrides,
}: {
  userId: string;
  userName: string;
  rolePermissions: readonly PermissionKey[];
  initialOverrides: PermissionOverride[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [overrides, setOverrides] = useState(initialOverrides);
  const [saving, setSaving] = useState<PermissionKey | null>(null);
  const [message, setMessage] = useState("");

  function getOverride(permission: PermissionKey) {
    return overrides.find((override) => override.permission === permission);
  }

  async function updatePermission(permission: PermissionKey, enabled: boolean | null) {
    const previousOverrides = overrides;
    setOverrides((current) => {
      const remaining = current.filter((override) => override.permission !== permission);
      return enabled === null ? remaining : [...remaining, { permission, enabled }];
    });
    setSaving(permission);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission, enabled }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        overrides?: PermissionOverride[];
      } | null;

      if (!response.ok || !payload?.overrides) {
        setOverrides(previousOverrides);
        setMessage(payload?.error ?? "Permission could not be updated.");
        return;
      }

      setOverrides(payload.overrides);
      setMessage("Permission updated.");
    } catch {
      setOverrides(previousOverrides);
      setMessage("Permission could not be updated.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold"
      >
        <ShieldCheck className="mr-2 h-4 w-4" /> Permissions
      </button>

      {isOpen ? (
        <AdminOverlayPortal onClose={() => setIsOpen(false)}>
          <div
            className="fixed inset-0 z-[170] flex items-end justify-center bg-slate-950/78 backdrop-blur-md sm:items-center sm:p-6"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsOpen(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={`permissions-${userId}`}
              className="admin-surface max-h-[90dvh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-t-[28px] p-5 sm:rounded-[28px] sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/70">Feature access</p>
                  <h2 id={`permissions-${userId}`} className="mt-1 truncate text-xl font-bold text-white">{userName}</h2>
                </div>
                <button type="button" onClick={() => setIsOpen(false)} aria-label="Close permissions" className="ld-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
                  <X className="h-4 w-4" />
                </button>
              </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {PERMISSION_DEFINITIONS.map((definition) => {
                const override = getOverride(definition.key);
                const roleEnabled = rolePermissions.includes(definition.key);
                const effectiveEnabled = override?.enabled ?? roleEnabled;

                return (
                  <div key={definition.key} className="rounded-[18px] border border-white/10 bg-white/[0.035] p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{definition.label}</p>
                        <p className="mt-1 text-xs text-white/58">{override ? "Custom" : "Role default"}</p>
                      </div>
                      <input
                        type="checkbox"
                        className="admin-toggle shrink-0"
                        checked={effectiveEnabled}
                        disabled={saving !== null}
                        onChange={(event) => void updatePermission(definition.key, event.target.checked)}
                        aria-label={`${definition.label} for ${userName}`}
                      />
                    </div>
                    {override ? (
                      <button type="button" disabled={saving !== null} onClick={() => void updatePermission(definition.key, null)} className="mt-2 text-xs font-semibold text-cyan-100/76 hover:text-cyan-100 disabled:opacity-50">
                        Use role default
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
              {message ? <p className="mt-4 text-sm text-white/70" role="status">{message}</p> : null}
            </section>
          </div>
        </AdminOverlayPortal>
      ) : null}
    </>
  );
}
