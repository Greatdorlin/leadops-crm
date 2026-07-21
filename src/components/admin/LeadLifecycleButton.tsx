"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionConfirmationDialog } from "./ActionConfirmationDialog";

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
  compact = false,
}: {
  leadId: string;
  action: keyof typeof actionCopy;
  onSuccessHref?: string;
  className: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");

  async function runAction() {
    const copy = actionCopy[action];
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/leads/${leadId}/trash`, {
        method: copy.method,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "We couldn't update this lead right now.");
        setIsSaving(false);
        return;
      }

      setIsConfirming(false);

      if (onSuccessHref) {
        router.push(onSuccessHref);
        router.refresh();
        return;
      }

      router.refresh();
    } catch {
      setError("We couldn't update this lead right now.");
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
        aria-label={compact ? actionCopy[action].label : undefined}
        title={compact ? actionCopy[action].label : undefined}
      >
        {isSaving ? (
          actionCopy[action].loading
        ) : compact && action === "trash" ? (
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          actionCopy[action].label
        )}
      </button>
      <ActionConfirmationDialog
        open={isConfirming}
        title={action === "delete" ? "Delete lead forever?" : action === "restore" ? "Restore this lead?" : "Move lead to trash?"}
        description={actionCopy[action].confirm}
        confirmLabel={actionCopy[action].label}
        isPending={isSaving}
        error={error}
        tone={action === "restore" ? "primary" : "danger"}
        onCancel={() => {
          setError("");
          setIsConfirming(false);
        }}
        onConfirm={() => void runAction()}
      />
    </>
  );
}
