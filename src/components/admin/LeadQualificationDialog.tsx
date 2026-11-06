"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsivePopover } from "./ResponsivePopover";
import { AdminPickerHeader, AdminPickerScrollArea } from "./AdminPickerPanel";
import { cn } from "@/lib/cn";
type Choice = { id: string; label: string; kind: "opportunity" | "product" };
export function LeadQualificationDialog({
  leadId,
  open,
  onClose,
  anchorRef,
}: {
  leadId: string;
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const router = useRouter();
  const [choices, setChoices] = useState<Choice[]>([]);
  const [scope, setScope] = useState<"one" | "all">("one");
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const guard = useRef(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    Promise.all([
      fetch(`/api/admin/leads/${leadId}/opportunities`),
      fetch("/api/admin/products"),
    ])
      .then(async (responses) => {
        if (responses.some((r) => !r.ok))
          throw new Error("Could not load products.");
        const [o, p] = await Promise.all(responses.map((r) => r.json()));
        if (!active) return;
        const existing = o.opportunities as Array<{
          id: string;
          offerLabel: string;
          status: string;
        }>;
        const names = new Set(existing.map((r) => r.offerLabel.toLowerCase()));
        setChoices([
          ...existing
            .filter((r) => !["won", "lost"].includes(r.status))
            .map((r) => ({
              id: r.id,
              label: r.offerLabel,
              kind: "opportunity" as const,
            })),
          ...(p.products as Array<{ id: string; name: string }>)
            .filter((r) => !names.has(r.name.toLowerCase()))
            .map((r) => ({
              id: r.id,
              label: r.name,
              kind: "product" as const,
            })),
        ]);
      })
      .catch(() => {
        if (active) setError("Could not load products. Close and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, leadId]);
  async function save() {
    if (guard.current) return;
    guard.current = true;
    setSaving(true);
    setError("");
    try {
      const choice = choices.find((c) => c.id === selected);
      if (scope === "one" && !choice) throw new Error("Choose a product.");
      if (!reason.trim()) throw new Error("Add a short reason.");
      const r = await fetch(`/api/admin/leads/${leadId}/qualification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          status: "unqualified",
          reason,
          ...(scope === "one" && choice
            ? {
                [choice.kind === "opportunity" ? "opportunityId" : "productId"]:
                  choice.id,
              }
            : {}),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save.");
      setSaved(
        scope === "all"
          ? "All current open products are marked unqualified."
          : `${choice?.label} is marked unqualified. Other offers stay in play.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
      guard.current = false;
    }
  }
  function finish() {
    onClose();
    if (saved) router.refresh();
  }
  if (saved)
    return (
      <ResponsivePopover
        anchorRef={anchorRef}
        ariaLabel="Qualification saved"
        desktopWidth={360}
        open={open}
        onClose={finish}
      >
        <AdminPickerHeader
          title="Qualification saved"
          description="The lead’s stage stays unchanged."
          onClose={finish}
        />
        <div className="space-y-4 p-4">
          <p role="status" className="text-sm">
            {saved}
          </p>
          <button
            className="admin-button-primary min-h-11 px-4 py-2 w-full"
            onClick={finish}
          >
            Done
          </button>
        </div>
      </ResponsivePopover>
    );
  return (
    <ResponsivePopover
      anchorRef={anchorRef}
      ariaLabel="Product qualification"
      desktopWidth={360}
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <AdminPickerHeader
        title="Unqualified for which product?"
        description="Other offers stay in play. Lost closes the whole lead."
        onClose={() => {
          if (!saving) onClose();
        }}
      />
      <AdminPickerScrollArea>
        <div className="space-y-4 p-3">
          <fieldset className="space-y-3">
            <legend className="sr-only">Qualification scope</legend>
            {(["one", "all"] as const).map((v) => (
              <label key={v} className="flex items-center gap-3 text-sm">
                <input
                  type="radio"
                  checked={scope === v}
                  onChange={() => setScope(v)}
                  name={`qualification-${leadId}`}
                />
                {v === "one" ? "One product" : "All current products"}
              </label>
            ))}
          </fieldset>
          {scope === "one" ? (
            <label className="block text-sm">
              Product
              <select
                aria-label="Product"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="admin-input min-h-11 px-3 py-2 mt-2 w-full"
              >
                <option value="">
                  {loading ? "Loading products…" : "Choose a product"}
                </option>
                {choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-white/60">
              Updates current open offers. Won and lost history stays intact.
            </p>
          )}
          <label className="block text-sm">
            Reason
            <textarea
              className="admin-input min-h-11 px-3 py-2 mt-2 w-full"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              placeholder="e.g. Budget is below this product’s price."
            />
          </label>
          <a className="text-sm underline" href="/settings/products">
            Manage products and preset values
          </a>
          {error ? (
            <p role="alert" className="text-sm text-rose-200">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void save()}
            className={cn(
              "admin-button-primary min-h-11 px-4 py-2 w-full",
              saving && "opacity-60",
            )}
          >
            {saving ? "Saving…" : "Save qualification"}
          </button>
        </div>
      </AdminPickerScrollArea>
    </ResponsivePopover>
  );
}
