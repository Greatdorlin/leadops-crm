"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Pause, Play, Plus, Route as WandSparkles, Trash2, X } from "lucide-react";
import { ActionConfirmationDialog } from "./ActionConfirmationDialog";
import { AdminOverlayPortal } from "./AdminOverlayPortal";
import { AdminSelect } from "./AdminSelect";
import { cn } from "@/lib/cn";

interface Rule {
  id: string;
  name: string;
  conditionField: string;
  conditionOperator: string;
  conditionValue: string;
  actionType: string;
  actionValue: string;
  isActive: boolean;
  sortOrder: number;
}
interface Option { id: string; label: string; key?: string }
type Draft = Omit<Rule, "id">;

const fieldLabels: Record<string, string> = { source: "Source", stage: "Stage", priority: "Priority", country: "Country", customer_type: "Lead type" };
const actionLabels: Record<string, string> = { assign_owner: "Assign owner", set_stage: "Move to stage", set_priority: "Set priority" };
const priorities = ["low", "medium", "high", "urgent"];
const customerTypes = [{ id: "direct", label: "Individual" }, { id: "business", label: "Company" }];

function emptyDraft(): Draft {
  return { name: "", conditionField: "source", conditionOperator: "equals", conditionValue: "", actionType: "assign_owner", actionValue: "", isActive: true, sortOrder: 0 };
}

export function WorkspaceAutomationManager({ initialRules, owners, sources, stages, demoMode = false }: { initialRules: Rule[]; owners: Option[]; sources: Option[]; stages: Option[]; demoMode?: boolean }) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const conditionOptions = useMemo(() => {
    if (draft.conditionField === "source") return sources;
    if (draft.conditionField === "stage") return stages;
    if (draft.conditionField === "priority") return priorities.map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1) }));
    if (draft.conditionField === "customer_type") return customerTypes;
    return [];
  }, [draft.conditionField, sources, stages]);
  const actionOptions = draft.actionType === "assign_owner" ? owners : draft.actionType === "set_stage" ? stages : priorities.map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1) }));

  function beginCreate() { setEditingId(null); setDraft(emptyDraft()); setMessage(""); setOpen(true); }
  function beginEdit(rule: Rule) { setEditingId(rule.id); setDraft({ ...rule }); setMessage(""); setOpen(true); }

  async function save() {
    setBusy(true); setMessage("");
    if (demoMode) { setMessage("Automation saved for this preview."); setBusy(false); return; }
    const response = await fetch(editingId ? `/api/admin/workspace-automations/${editingId}` : "/api/admin/workspace-automations", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const payload = await response.json().catch(() => null) as { error?: string; rule?: Rule } | null;
    if (!response.ok || !payload?.rule) { setMessage(payload?.error ?? "We couldn't save this automation."); setBusy(false); return; }
    setRules((current) => editingId ? current.map((rule) => rule.id === editingId ? payload.rule! : rule) : [...current, payload.rule!]);
    setBusy(false); setOpen(false); startTransition(() => router.refresh());
  }

  async function toggle(rule: Rule) {
    if (demoMode) { setRules((current) => current.map((item) => item.id === rule.id ? { ...item, isActive: !item.isActive } : item)); return; }
    const response = await fetch(`/api/admin/workspace-automations/${rule.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...rule, isActive: !rule.isActive }) });
    const payload = await response.json().catch(() => null) as { rule?: Rule } | null;
    if (response.ok && payload?.rule) setRules((current) => current.map((item) => item.id === rule.id ? payload.rule! : item));
  }

  async function remove() {
    if (!deleteId) return;
    if (!demoMode) {
      const response = await fetch(`/api/admin/workspace-automations/${deleteId}`, { method: "DELETE" });
      if (!response.ok) return;
    }
    setRules((current) => current.filter((rule) => rule.id !== deleteId)); setDeleteId(null);
  }

  function labelFor(rule: Rule, side: "condition" | "action") {
    const value = side === "condition" ? rule.conditionValue : rule.actionValue;
    const options = side === "condition"
      ? rule.conditionField === "source" ? sources : rule.conditionField === "stage" ? stages : rule.conditionField === "customer_type" ? customerTypes : []
      : rule.actionType === "assign_owner" ? owners : rule.actionType === "set_stage" ? stages : [];
    return options.find((option) => option.id === value)?.label ?? value.replaceAll("_", " ");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-6 text-white/62">Rules run when a new lead arrives from forms, imports, ads, webhooks, or manual entry.</p>
        <button type="button" onClick={beginCreate} className="admin-button-primary inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"><Plus className="h-4 w-4" />New automation</button>
      </div>
      {rules.length ? <div className="grid gap-3">{rules.map((rule) => <article key={rule.id} className={cn("rounded-[22px] border p-4 transition", rule.isActive ? "border-emerald-300/18 bg-emerald-300/[0.045]" : "border-white/10 bg-white/[0.035] opacity-75")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-white/10 bg-white/[0.06] text-white/74"><WandSparkles className="h-[18px] w-[18px]" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-white">{rule.name}</h3><span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.11em]", rule.isActive ? "bg-emerald-300/12 text-emerald-100" : "bg-white/[0.07] text-white/48")}>{rule.isActive ? "Active" : "Paused"}</span></div><div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/66"><span>{fieldLabels[rule.conditionField]} {rule.conditionOperator === "not_equals" ? "is not" : "is"} <strong className="font-semibold text-white/90">{labelFor(rule, "condition")}</strong></span><ArrowRight className="h-4 w-4 text-[color:var(--workspace-accent)]" /><span>{actionLabels[rule.actionType]} <strong className="font-semibold text-white/90">{labelFor(rule, "action")}</strong></span></div></div></div>
          <div className="flex flex-wrap gap-2 lg:justify-end"><button type="button" onClick={() => void toggle(rule)} className="admin-button-secondary inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold">{rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{rule.isActive ? "Pause" : "Activate"}</button><button type="button" onClick={() => beginEdit(rule)} className="admin-button-secondary h-10 rounded-full px-4 text-sm font-semibold">Edit</button><button type="button" onClick={() => setDeleteId(rule.id)} className="ld-focus-ring grid h-10 w-10 place-items-center rounded-full border border-rose-300/20 bg-rose-400/[0.08] text-rose-100 hover:bg-rose-400/[0.14]" aria-label={`Delete ${rule.name}`}><Trash2 className="h-4 w-4" /></button></div>
        </div>
      </article>)}</div> : <div className="rounded-[24px] border border-dashed border-white/14 bg-white/[0.025] px-5 py-10 text-center"><WandSparkles className="mx-auto h-6 w-6 text-white/38" /><p className="mt-3 font-semibold text-white">No workspace automation yet</p><p className="mt-1 text-sm text-white/56">Create one rule to route incoming leads automatically.</p></div>}

      <AdminOverlayPortal open={open}><div className="fixed inset-0 z-[170] flex items-end justify-center bg-[#02040c]/72 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}><div role="dialog" aria-modal="true" aria-label="Workspace automation" className="ld-glass-panel flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] border border-white/14 bg-[#080c18]/[0.98] shadow-2xl sm:rounded-[28px]">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">Workspace rule</p><h2 className="mt-1 text-xl font-semibold text-white">{editingId ? "Edit automation" : "New automation"}</h2></div><button type="button" onClick={() => setOpen(false)} className="ld-focus-ring grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 hover:text-white" aria-label="Close"><X className="h-4 w-4" /></button></header>
        <div className="ld-premium-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <label className="block"><span className="mb-2 block text-xs font-semibold text-white/68">Name</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="admin-input h-12 w-full rounded-[16px] px-4 text-sm outline-none" placeholder="Route website leads" /></label>
          <section className="space-y-3 rounded-[20px] border border-white/10 bg-white/[0.035] p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">When a new lead</p><div className="grid gap-3 sm:grid-cols-2"><AdminSelect aria-label="Condition field" value={draft.conditionField} onChange={(event) => setDraft({ ...draft, conditionField: event.target.value, conditionValue: "" })}>{Object.entries(fieldLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</AdminSelect><AdminSelect aria-label="Condition operator" value={draft.conditionOperator} onChange={(event) => setDraft({ ...draft, conditionOperator: event.target.value })}><option value="equals">is</option><option value="not_equals">is not</option></AdminSelect></div>{draft.conditionField === "country" ? <input value={draft.conditionValue} onChange={(event) => setDraft({ ...draft, conditionValue: event.target.value })} className="admin-input h-12 w-full rounded-[16px] px-4 text-sm outline-none" placeholder="Country name" /> : <AdminSelect aria-label="Condition value" value={draft.conditionValue} onChange={(event) => setDraft({ ...draft, conditionValue: event.target.value })}><option value="">Choose value</option>{conditionOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</AdminSelect>}</section>
          <section className="space-y-3 rounded-[20px] border border-white/10 bg-white/[0.035] p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">Then</p><AdminSelect aria-label="Automation action" value={draft.actionType} onChange={(event) => setDraft({ ...draft, actionType: event.target.value, actionValue: "" })}>{Object.entries(actionLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</AdminSelect><AdminSelect aria-label="Action value" value={draft.actionValue} onChange={(event) => setDraft({ ...draft, actionValue: event.target.value })}><option value="">Choose value</option>{actionOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</AdminSelect></section>
          {message ? <p role="status" className="text-sm text-amber-100">{message}</p> : null}
        </div>
        <footer className="flex gap-2 border-t border-white/10 bg-[#080c18]/95 p-4"><button type="button" onClick={() => setOpen(false)} className="admin-button-secondary h-11 flex-1 rounded-[16px] text-sm font-semibold">Cancel</button><button type="button" disabled={busy} onClick={() => void save()} className="admin-button-primary h-11 flex-[1.35] rounded-[16px] text-sm font-semibold disabled:opacity-50">{busy ? "Saving..." : "Save automation"}</button></footer>
      </div></div></AdminOverlayPortal>
      <ActionConfirmationDialog open={Boolean(deleteId)} title="Delete automation?" description="New leads will stop using this rule immediately. Existing lead activity stays intact." confirmLabel="Delete automation" tone="danger" onCancel={() => setDeleteId(null)} onConfirm={() => void remove()} />
    </div>
  );
}
