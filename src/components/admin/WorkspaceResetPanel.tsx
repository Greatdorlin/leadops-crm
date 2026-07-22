"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { WorkspaceImpactConfirmation } from "./WorkspaceImpactConfirmation";

const CONFIRMATION = "RESET WORKSPACE SETTINGS";

export function WorkspaceResetPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function reset() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings/reset-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: CONFIRMATION }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "Workspace settings could not be reset.");
        return;
      }
      setOpen(false);
      setMessage("Workspace appearance and layout were restored. Business data was preserved.");
      startTransition(() => router.refresh());
    } catch {
      setMessage("Workspace settings could not be reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-rose-300/18 bg-rose-400/[0.055] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100/72">Restricted action</p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-white">Reset workspace settings</h2>
          <p className="mt-2 text-sm leading-6 text-white/68">Restores branding, login appearance, navigation, dashboard, lead preview, and preset defaults. Leads, users, forms, integrations, currency, and authentication are preserved.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-rose-300/24 bg-rose-400/12 px-4 text-sm font-semibold text-rose-50 transition hover:bg-rose-400/18"><RotateCcw className="h-4 w-4" />Reset settings</button>
      </div>
      {message ? <p role="status" className="mt-4 text-sm text-white/72">{message}</p> : null}
      {open ? <WorkspaceImpactConfirmation
        open={open}
        title="Reset workspace settings?"
        description="This affects everyone in the workspace. Business records and access remain intact, but visual and layout customization will return to Leads Desk defaults."
        actionLabel="Reset workspace settings"
        confirmationPhrase={CONFIRMATION}
        busy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={() => void reset()}
      /> : null}
    </section>
  );
}
