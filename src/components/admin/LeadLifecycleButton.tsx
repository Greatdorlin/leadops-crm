"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const actionCopy = {
  trash: {
    confirm: "Move this lead to trash?",
    loading: "Moving...",
    label: "Move to trash",
    method: "POST",
  },
  restore: {
    confirm: "Restore this lead to the active queue?",
    loading: "Restoring...",
    label: "Restore",
    method: "PATCH",
  },
  delete: {
    confirm: "Delete this lead permanently? This cannot be undone.",
    loading: "Deleting...",
    label: "Delete forever",
    method: "DELETE",
  },
} as const;

export function LeadLifecycleButton({
  leadId,
  action,
  onSuccessHref,
  className,
}: {
  leadId: string;
  action: keyof typeof actionCopy;
  onSuccessHref?: string;
  className: string;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function runAction() {
    const copy = actionCopy[action];
    if (typeof window !== "undefined" && !window.confirm(copy.confirm)) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/leads/${leadId}/trash`, {
        method: copy.method,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (typeof window !== "undefined") {
          window.alert(payload?.error ?? "We couldn't update this lead right now.");
        }
        setIsSaving(false);
        return;
      }

      if (onSuccessHref) {
        router.push(onSuccessHref);
        router.refresh();
        return;
      }

      router.refresh();
    } catch {
      if (typeof window !== "undefined") {
        window.alert("We couldn't update this lead right now.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void runAction()}
      disabled={isSaving}
      className={className}
    >
      {isSaving ? actionCopy[action].loading : actionCopy[action].label}
    </button>
  );
}
