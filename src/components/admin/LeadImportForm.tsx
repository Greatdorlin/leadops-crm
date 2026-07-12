"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseZap, FileCheck2, UploadCloud } from "lucide-react";
import {
  migrationSourceRegistry,
  type CrmMigrationSource,
} from "@/lib/migrations/sources";
import { AdminSelect } from "./AdminSelect";
import { InfoTip } from "./ui/InfoTip";

type FailedRow = { rowNumber: number; error: string };

export function LeadImportForm({
  assigneeOptions,
  initialSourceSystem = "generic_csv",
}: {
  assigneeOptions: Array<{ label: string; value: string }>;
  initialSourceSystem?: CrmMigrationSource;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceSystem, setSourceSystem] = useState<CrmMigrationSource>(initialSourceSystem);
  const [sourceFileName, setSourceFileName] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [sourceDetail, setSourceDetail] = useState(
    initialSourceSystem === "generic_csv" ? "crm_migration" : `${initialSourceSystem}_migration`,
  );
  const [csvText, setCsvText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState<{
    importId: string;
    total: number;
    valid: number;
    failed: number;
    failedRows: FailedRow[];
  } | null>(null);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    failed: number;
    unresolvedOwners: number;
    remaining: number;
    complete: boolean;
    failedRows: FailedRow[];
  } | null>(null);

  function resetStagedResult() {
    setValidation(null);
    setResult(null);
  }

  async function validateCsv() {
    if (!csvText.trim()) {
      setMessage("Paste rows or load a CSV file first.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    resetStagedResult();

    try {
      const response = await fetch("/api/admin/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate",
          csvText,
          sourceSystem,
          sourceFileName: sourceFileName || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            importId?: string;
            total?: number;
            valid?: number;
            failed?: number;
            failedRows?: FailedRow[];
          }
        | null;

      if (!response.ok || !payload?.importId) {
        setMessage(payload?.error ?? "We couldn't validate this file.");
        setIsSaving(false);
        return;
      }

      setValidation({
        importId: payload.importId,
        total: payload.total ?? 0,
        valid: payload.valid ?? 0,
        failed: payload.failed ?? 0,
        failedRows: payload.failedRows ?? [],
      });
      setMessage("Validation complete. Review the result before importing.");
      setIsSaving(false);
    } catch {
      setMessage("We couldn't validate this file.");
      setIsSaving(false);
    }
  }

  async function commitImport() {
    if (!validation) {
      setMessage("Validate the file before importing it.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      let previousRemaining = Number.POSITIVE_INFINITY;

      for (let batch = 0; batch < 500; batch += 1) {
        const response = await fetch("/api/admin/leads/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "commit",
            importId: validation.importId,
            assignedTo: assignedTo || null,
            sourceDetail: sourceDetail || null,
          }),
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              error?: string;
              created?: number;
              updated?: number;
              failed?: number;
              unresolvedOwners?: number;
              remaining?: number;
              complete?: boolean;
              failedRows?: FailedRow[];
            }
          | null;

        if (!response.ok) {
          setMessage(payload?.error ?? "We couldn't commit this import.");
          setIsSaving(false);
          return;
        }

        const nextResult = {
          created: payload?.created ?? 0,
          updated: payload?.updated ?? 0,
          failed: payload?.failed ?? 0,
          unresolvedOwners: payload?.unresolvedOwners ?? 0,
          remaining: payload?.remaining ?? 0,
          complete: payload?.complete ?? false,
          failedRows: payload?.failedRows ?? [],
        };
        setResult(nextResult);

        if (nextResult.complete) {
          setMessage(nextResult.failed > 0 ? "Import completed with exceptions." : "Import completed.");
          setIsSaving(false);
          startTransition(() => router.refresh());
          return;
        }

        setMessage(`Importing safely in batches. ${nextResult.remaining.toLocaleString()} rows remain.`);
        if (nextResult.remaining >= previousRemaining) {
          setMessage("Import paused without losing progress. Select Resume import to continue.");
          setIsSaving(false);
          return;
        }
        previousRemaining = nextResult.remaining;
      }

      setMessage("Import paused after the safe browser limit. Select Resume import to continue.");
      setIsSaving(false);
    } catch {
      setMessage("The connection stopped, but imported rows were saved. Select Resume import to continue.");
      setIsSaving(false);
    }
  }

  async function loadCsvFile(file: File) {
    if (file.size > 5_000_000) {
      setMessage("Use the background migration path for files over 5 MB.");
      return;
    }

    const nextText = await file.text();
    setCsvText(nextText);
    setSourceFileName(file.name);
    resetStagedResult();
    setMessage(`${file.name} loaded. Validate it before importing.`);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-3">
        <label className="space-y-2">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
            Source platform
            <InfoTip label="Source-specific aliases improve field matching while the original row remains archived." />
          </span>
          <AdminSelect
            value={sourceSystem}
            onChange={(event) => {
              const nextSource = event.target.value as CrmMigrationSource;
              setSourceSystem(nextSource);
              setSourceDetail(nextSource === "generic_csv" ? "crm_migration" : `${nextSource}_migration`);
              resetStagedResult();
            }}
            className="h-11"
          >
            {migrationSourceRegistry.map((source) => (
              <option key={source.id} value={source.id}>{source.label}</option>
            ))}
          </AdminSelect>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Default owner</span>
          <AdminSelect value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="h-11">
            <option value="">Keep matched owners or leave unassigned</option>
            {assigneeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </AdminSelect>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Import label</span>
          <input
            type="text"
            value={sourceDetail}
            onChange={(event) => setSourceDetail(event.target.value)}
            className="admin-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
          />
        </label>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void loadCsvFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold"
      >
        <UploadCloud className="mr-2 h-4 w-4" />
        Load CSV
      </button>

      <label className="space-y-2">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
          Source rows
          <InfoTip label="Names, contact details, company, location, stage, priority, owner, source, notes, and potential value are matched automatically. Unmatched columns remain in the import archive." />
        </span>
        <textarea
          value={csvText}
          onChange={(event) => {
            setCsvText(event.target.value);
            setSourceFileName("");
            resetStagedResult();
          }}
          rows={9}
          placeholder={`Full Name,Email Address,Company,Stage,Amount\nAda Lovelace,ada@example.com,Analytical Engines,qualified,250000`}
          className="admin-textarea min-h-[220px] w-full rounded-2xl px-4 py-3 font-mono text-sm outline-none"
        />
      </label>

      {validation ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Rows", validation.total],
            ["Ready", validation.valid],
            ["Needs review", validation.failed],
          ].map(([label, value]) => (
            <div key={label} className="admin-surface-soft rounded-[20px] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/64">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={() => void validateCsv()}
          disabled={isSaving}
          className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
        >
          <FileCheck2 className="mr-2 h-4 w-4" />
          {isSaving && !validation ? "Validating..." : "Validate file"}
        </button>
        <button
          type="button"
          onClick={() => void commitImport()}
          disabled={isSaving || !validation || validation.valid === 0 || result?.complete}
          className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold disabled:opacity-45"
        >
          <DatabaseZap className="mr-2 h-4 w-4" />
          {isSaving && validation
            ? "Importing..."
            : result && !result.complete
              ? "Resume import"
              : "Import validated rows"}
        </button>
      </div>

      {message ? <p className="text-sm text-white/72" role="status">{message}</p> : null}
      {(validation?.failedRows.length || result?.failedRows.length) ? (
        <div className="rounded-[20px] border border-rose-300/20 bg-rose-400/[0.08] p-4 text-sm text-rose-100">
          {(result?.failedRows ?? validation?.failedRows ?? []).slice(0, 5).map((row) => (
            <p key={`${row.rowNumber}-${row.error}`}>Row {row.rowNumber}: {row.error}</p>
          ))}
        </div>
      ) : null}
      {result ? (
        <div className="rounded-[20px] border border-emerald-300/20 bg-emerald-400/[0.08] p-4 text-sm text-emerald-50">
          <p className="font-semibold">
            {result.created} created, {result.updated} updated, {result.failed} failed
            {result.complete ? "." : `, ${result.remaining} remaining.`}
          </p>
          {result.unresolvedOwners > 0 ? (
            <p className="mt-1 text-emerald-50/76">{result.unresolvedOwners} legacy owners were left unassigned instead of being guessed.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
