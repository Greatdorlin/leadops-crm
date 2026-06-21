"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatAdminAccessLevelLabel } from "@/lib/crm/formatters";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { AdminSelect } from "./AdminSelect";
import { TeamAvatar } from "./TeamAvatar";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [accessLevel, setAccessLevel] = useState<AdminAccessLevel>(defaultAccessLevel);
  const [isActive, setIsActive] = useState(true);
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
      setAvatarUrl("");
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
        <p className="text-xs text-white/45">Max 2MB.</p>
      </div>
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
      {message ? <p className="mt-3 text-sm text-white/62">{message}</p> : null}
    </div>
  );
}
