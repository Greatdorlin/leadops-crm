"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatAdminAccessLevelLabel } from "@/lib/crm/formatters";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { AdminSelect } from "./AdminSelect";

export function TeamAccessForm({
  grantableAccessLevels,
}: {
  grantableAccessLevels: AdminAccessLevel[];
}) {
  const defaultAccessLevel =
    grantableAccessLevels.find((level) => level === "general_admin") ??
    grantableAccessLevels[0] ??
    "sales_rep";
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<AdminAccessLevel>(defaultAccessLevel);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveUserAccess() {
    if (!fullName.trim() || !email.trim()) {
      setMessage("Add a full name and email before saving access.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          accessLevel,
          isActive,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save this team access right now.");
        setIsSaving(false);
        return;
      }

      setFullName("");
      setEmail("");
      setAccessLevel(defaultAccessLevel);
      setIsActive(true);
      setMessage("Team access saved.");
      setIsSaving(false);
      router.refresh();
    } catch {
      setMessage("We couldn't save this team access right now.");
      setIsSaving(false);
    }
  }

  return (
    <div className="admin-surface-soft rounded-[24px] p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_0.8fr_auto]">
        <input
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Team member name"
          className="admin-input h-11 rounded-2xl px-4 text-sm outline-none"
        />
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="person@flyconnectglobal.com"
          className="admin-input h-11 rounded-2xl px-4 text-sm outline-none"
        />
        <AdminSelect
          value={accessLevel}
          onChange={(event) => setAccessLevel(event.target.value as AdminAccessLevel)}
          className="h-11"
        >
          {grantableAccessLevels.map((level) => (
            <option key={level} value={level}>
              {formatAdminAccessLevelLabel(level)}
            </option>
          ))}
        </AdminSelect>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void saveUserAccess()}
          className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold"
        >
          {isSaving ? "Saving..." : "Save access"}
        </button>
      </div>
      <label className="mt-3 inline-flex items-center gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 bg-transparent"
        />
        Allow this person to sign in to admin
      </label>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
