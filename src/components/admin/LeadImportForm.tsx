"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSelect } from "./AdminSelect";

export function LeadImportForm({
  assigneeOptions,
}: {
  assigneeOptions: Array<{ label: string; value: string }>;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assignedTo, setAssignedTo] = useState("");
  const [sourceDetail, setSourceDetail] = useState("csv_import");
  const [csvText, setCsvText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    failedRows: Array<{ rowNumber: number; error: string }>;
  } | null>(null);

  async function importCsv() {
    if (!csvText.trim()) {
      setMessage("Paste CSV rows or load a CSV file before importing.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setResult(null);

    try {
      const response = await fetch("/api/admin/leads/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csvText,
          assignedTo: assignedTo || null,
          sourceDetail: sourceDetail || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            created?: number;
            updated?: number;
            failedRows?: Array<{ rowNumber: number; error: string }>;
          }
        | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "We couldn't import those leads right now.");
        setIsSaving(false);
        return;
      }

      const nextResult = {
        created: payload?.created ?? 0,
        updated: payload?.updated ?? 0,
        failedRows: payload?.failedRows ?? [],
      };

      setResult(nextResult);
      setMessage(
        nextResult.failedRows.length > 0
          ? "Some rows imported, but a few still need fixing."
          : "Lead import completed.",
      );
      setIsSaving(false);
      if (nextResult.failedRows.length === 0) {
        setCsvText("");
      }
      startTransition(() => router.refresh());
    } catch {
      setMessage("We couldn't import those leads right now.");
      setIsSaving(false);
    }
  }

  async function loadCsvFile(file: File) {
    const nextText = await file.text();
    setCsvText(nextText);
    setMessage(`${file.name} loaded. Review the rows, then import.`);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Default owner</span>
          <AdminSelect
            value={assignedTo}
            onChange={(event) => setAssignedTo(event.target.value)}
            className="h-11"
          >
            <option value="">Keep row owners or import unassigned</option>
            {assigneeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Import label</span>
          <input
            type="text"
            value={sourceDetail}
            onChange={(event) => setSourceDetail(event.target.value)}
            placeholder="csv_import"
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
        <div className="flex items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void loadCsvFile(file);
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="admin-button-secondary h-11 rounded-2xl px-4 text-sm"
          >
            Load CSV file
          </button>
        </div>
      </div>

      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">CSV rows</span>
        <textarea
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          rows={9}
          placeholder={`Full Name,Email Address,Phone,Stage,Priority,Owner,Source\nAda Lovelace,ada@example.com,+2348012345678,qualified,high,rep@example.com,website form`}
          className="admin-textarea min-h-[220px] w-full rounded-2xl px-4 py-3 font-mono text-sm outline-none"
        />
      </label>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
        Supported headers: <span className="font-medium text-slate-700">Full Name, First Name, Last Name, Email Address, Phone, Stage, Priority, Owner, Source, Notes</span>.
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-[18rem] text-sm leading-6 text-slate-500">
          Imports use the same dedupe flow.
        </p>
        <button
          type="button"
          onClick={() => void importCsv()}
          disabled={isSaving}
          className="admin-button-primary h-11 min-w-[136px] self-start rounded-2xl px-5 text-sm"
        >
          {isSaving ? "Importing..." : "Import leads"}
        </button>
      </div>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      {result ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-slate-950">
            {result.created} created • {result.updated} updated
          </p>
          {result.failedRows.length > 0 ? (
            <div className="mt-3 space-y-2 text-sm text-rose-700">
              {result.failedRows.slice(0, 5).map((row) => (
                <p key={`${row.rowNumber}-${row.error}`}>Row {row.rowNumber}: {row.error}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
