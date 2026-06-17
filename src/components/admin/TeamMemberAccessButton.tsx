"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TeamMemberAccessButton({
  userId,
  isActive,
  className,
}: {
  userId: string;
  isActive: boolean;
  className: string;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function updateAccess(nextIsActive: boolean) {
    const prompt = nextIsActive
      ? "Restore this team member's admin access?"
      : "Remove this team member from admin access?";
    if (typeof window !== "undefined" && !window.confirm(prompt)) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: nextIsActive }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (typeof window !== "undefined") {
          window.alert(payload?.error ?? "We couldn't update this team member right now.");
        }
        setIsSaving(false);
        return;
      }

      router.refresh();
    } catch {
      if (typeof window !== "undefined") {
        window.alert("We couldn't update this team member right now.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void updateAccess(!isActive)}
      disabled={isSaving}
      className={className}
    >
      {isSaving ? "Saving..." : isActive ? "Remove member" : "Restore access"}
    </button>
  );
}
