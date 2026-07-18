"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatAdminAccessLevelLabel } from "@/lib/crm/formatters";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { AdminSelect } from "./AdminSelect";
import { TeamAvatar } from "./TeamAvatar";
import { LeadAccessScopeFields, type ScopeOption } from "./LeadAccessScopeFields";
import type { LeadAccessScope } from "@/lib/crm/types";

export function TeamAccessForm({
  grantableAccessLevels,
  branches = [], departments = [], teams = [],
}: {
  grantableAccessLevels: AdminAccessLevel[];
  branches?: ScopeOption[];
  departments?: ScopeOption[];
  teams?: ScopeOption[];
}) {
  const defaultAccessLevel =
    grantableAccessLevels.find((level) => level === "general_admin") ??
    grantableAccessLevels[0] ??
    "sales_rep";
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [accessLevel, setAccessLevel] = useState<AdminAccessLevel>(defaultAccessLevel);
  const [isActive, setIsActive] = useState(true);
  const [accessScope, setAccessScope] = useState<LeadAccessScope>("own");
  const [scopeId, setScopeId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activationUrl, setActivationUrl] = useState("");

  function handleAvatarFile(file?: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Choose a PNG, JPG, WebP, or GIF image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Profile photos must be 2MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
        setMessage("Photo ready. Save access to apply it.");
      }
    };
    reader.onerror = () => setMessage("We couldn't read that image.");
    reader.readAsDataURL(file);
  }

  async function saveUserAccess() {
    if (!fullName.trim() || !email.trim()) {
      setMessage("Add a full name and email before saving access.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setActivationUrl("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          avatarUrl,
          accessLevel,
          isActive,
          accessScope,
          branchId: accessScope === "branch" ? scopeId : null,
          departmentId: accessScope === "department" ? scopeId : null,
          teamId: accessScope === "team" ? scopeId : null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        activationUrl?: string;
        error?: string;
      } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save this team access right now.");
        setIsSaving(false);
        return;
      }

      setFullName("");
      setEmail("");
      setAvatarUrl("");
      setAccessLevel(defaultAccessLevel);
      setIsActive(true);
      setAccessScope("own");
      setScopeId("");
      setActivationUrl(payload?.activationUrl ?? "");
      setMessage("Team access saved. Share the activation link securely.");
      setIsSaving(false);
      router.refresh();
    } catch {
      setMessage("We couldn't save this team access right now.");
      setIsSaving(false);
    }
  }

  async function copyActivationLink() {
    try {
      await navigator.clipboard.writeText(activationUrl);
      setMessage("Activation link copied.");
    } catch {
      setMessage("Select and copy the activation link below.");
    }
  }

  return (
    <div className="admin-surface-soft rounded-[24px] p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TeamAvatar name={fullName} email={email} avatarUrl={avatarUrl} size="md" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => handleAvatarFile(event.target.files?.[0])}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold"
        >
          Upload photo
        </button>
        {avatarUrl ? (
          <button
            type="button"
            onClick={() => {
              setAvatarUrl("");
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
          >
            Remove
          </button>
        ) : null}
        <p className="text-xs text-white/70">Max 2MB.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
          placeholder="person@example.com"
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
        <LeadAccessScopeFields
          accessScope={accessScope}
          onAccessScopeChange={setAccessScope}
          scopeId={scopeId}
          onScopeIdChange={setScopeId}
          branches={branches}
          departments={departments}
          teams={teams}
        />
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void saveUserAccess()}
          className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold"
        >
          {isSaving ? "Saving..." : "Save access"}
        </button>
      </div>
      <label className="mt-3 flex max-w-md items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
        <span>Allow this person to sign in to admin</span>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="admin-toggle shrink-0"
        />
      </label>
      {message ? <p className="mt-3 text-sm text-white/70">{message}</p> : null}
      {activationUrl ? (
        <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100">Activation link</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly aria-label="Activation link" value={activationUrl} onFocus={(event) => event.currentTarget.select()} className="admin-input h-11 min-w-0 flex-1 rounded-xl px-3 text-xs outline-none" />
            <button type="button" onClick={() => void copyActivationLink()} className="admin-button-primary h-11 rounded-xl px-4 text-sm font-semibold">Copy link</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
