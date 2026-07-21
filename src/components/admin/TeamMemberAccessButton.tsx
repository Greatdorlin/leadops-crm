"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionConfirmationDialog } from "./ActionConfirmationDialog";

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
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");

  async function updateAccess(nextIsActive: boolean) {
    setIsSaving(true);
    setError("");

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
        setError(payload?.error ?? "We couldn't update this team member right now.");
        setIsSaving(false);
        return;
      }

      setIsConfirming(false);
      router.refresh();
    } catch {
      setError("We couldn't update this team member right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setIsConfirming(true);
        }}
        disabled={isSaving}
        className={className}
      >
        {isSaving ? "Saving..." : isActive ? "Remove member" : "Restore access"}
      </button>
      <ActionConfirmationDialog
        open={isConfirming}
        title={isActive ? "Remove this team member?" : "Restore this team member?"}
        description={isActive ? "They will lose workspace access until an administrator restores it." : "They will regain access using their existing role and permissions."}
        confirmLabel={isActive ? "Remove member" : "Restore access"}
        tone={isActive ? "danger" : "primary"}
        error={error}
        isPending={isSaving}
        onCancel={() => setIsConfirming(false)}
        onConfirm={() => void updateAccess(!isActive)}
      />
    </>
  );
}
