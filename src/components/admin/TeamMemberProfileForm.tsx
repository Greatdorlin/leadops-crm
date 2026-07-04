"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatAdminAccessLevelLabel } from "@/lib/crm/formatters";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { AdminSelect } from "./AdminSelect";
import { TeamAvatar } from "./TeamAvatar";

export function TeamMemberProfileForm({
  userId,
  fullName: initialFullName,
  email,
  avatarUrl: initialAvatarUrl,
  accessLevel: initialAccessLevel,
  isActive: initialIsActive,
  grantableAccessLevels = [],
  canEditAccess = false,
  canEditActive = false,
  compact = false,
}: {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  accessLevel: AdminAccessLevel;
  isActive: boolean;
  grantableAccessLevels?: AdminAccessLevel[];
  canEditAccess?: boolean;
  canEditActive?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fullName, setFullName] = useState(initialFullName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [accessLevel, setAccessLevel] = useState<AdminAccessLevel>(initialAccessLevel);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

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
        setMessage("Photo ready. Save to apply it.");
      }
    };
    reader.onerror = () => setMessage("We couldn't read that image.");
    reader.readAsDataURL(file);
  }

  async function saveProfile() {
    if (!fullName.trim()) {
      setMessage("Add a name before saving.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          avatarUrl,
          ...(canEditAccess ? { accessLevel } : {}),
          ...(canEditActive ? { isActive } : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't save this profile.");
        setIsSaving(false);
        return;
      }

      setMessage("Profile saved.");
      setIsSaving(false);
      router.refresh();
    } catch {
      setMessage("We couldn't save this profile.");
      setIsSaving(false);
    }
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      <div className="flex items-center gap-4">
        <TeamAvatar name={fullName} email={email} avatarUrl={avatarUrl} size={compact ? "md" : "lg"} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{fullName || email}</p>
          <p className="truncate text-xs text-white/70">{email}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            {formatAdminAccessLevelLabel(accessLevel)}
          </p>
        </div>
      </div>

      <div className={compact ? "grid gap-3" : "grid gap-4 md:grid-cols-2"}>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Name</span>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
            placeholder="Team member name"
          />
        </label>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Profile photo</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) => handleAvatarFile(event.target.files?.[0])}
            className="sr-only"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold"
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
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
              >
                Remove
              </button>
            ) : null}
          </div>
          <p className="text-xs leading-5 text-white/70">PNG, JPG, WebP, or GIF. Max 2MB.</p>
        </div>

        {canEditAccess && grantableAccessLevels.length > 0 ? (
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Access</span>
            <AdminSelect
              value={accessLevel}
              onChange={(event) => setAccessLevel(event.target.value as AdminAccessLevel)}
              className="h-11"
            >
              {[initialAccessLevel, ...grantableAccessLevels]
                .filter((level, index, list) => list.indexOf(level) === index)
                .map((level) => (
                  <option key={level} value={level}>
                    {formatAdminAccessLevelLabel(level)}
                  </option>
                ))}
            </AdminSelect>
          </label>
        ) : null}

        {canEditActive ? (
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white/72">
            <span>Active workspace access</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="admin-toggle shrink-0"
            />
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void saveProfile()}
          className="admin-button-primary inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold"
        >
          {isSaving ? "Saving..." : "Save profile"}
        </button>
        {message ? <p className="text-sm text-white/70">{message}</p> : null}
      </div>
    </div>
  );
}
