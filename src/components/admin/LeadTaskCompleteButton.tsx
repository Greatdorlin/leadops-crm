"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LeadTaskCompleteButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

  async function completeTask() {
    setIsCompleting(true);

    try {
      const response = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true }),
      });

      if (!response.ok) {
        setIsCompleting(false);
        return;
      }

      setIsCompleting(false);
      router.refresh();
    } catch {
      setIsCompleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void completeTask()}
      disabled={isCompleting}
      className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
    >
      {isCompleting ? "Completing..." : "Mark done"}
    </button>
  );
}
