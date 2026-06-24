"use client";

import { ChevronDown, Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type ExportFormat = "csv" | "xlsx";

type ExportFieldOption = {
  id: string;
  label: string;
  group: string;
  defaultSelected: boolean;
};

function getFilenameFromDisposition(disposition: string | null, fallback: string) {
  if (!disposition) {
    return fallback;
  }

  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const asciiMatch = disposition.match(/filename="([^"]+)"/i);
  return asciiMatch?.[1] ?? fallback;
}

export function AdminLeadExportButton({
  fieldOptions,
  defaultCreatedFrom = "",
  defaultCreatedTo = "",
}: {
  fieldOptions: ExportFieldOption[];
  defaultCreatedFrom?: string;
  defaultCreatedTo?: string;
}) {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);
  const [message, setMessage] = useState("");
  const [createdFrom, setCreatedFrom] = useState(defaultCreatedFrom);
  const [createdTo, setCreatedTo] = useState(defaultCreatedTo);
  const [selectedFields, setSelectedFields] = useState<string[]>(
    fieldOptions.filter((field) => field.defaultSelected).map((field) => field.id),
  );

  const groupedFieldOptions = useMemo(() => {
    const groups = new Map<string, ExportFieldOption[]>();
    fieldOptions.forEach((field) => {
      const items = groups.get(field.group) ?? [];
      items.push(field);
      groups.set(field.group, items);
    });
    return [...groups.entries()];
  }, [fieldOptions]);

  function toggleField(fieldId: string) {
    setSelectedFields((current) =>
      current.includes(fieldId)
        ? current.filter((value) => value !== fieldId)
        : [...current, fieldId],
    );
  }

  function selectDefaultFields() {
    setSelectedFields(fieldOptions.filter((field) => field.defaultSelected).map((field) => field.id));
  }

  function selectAllFields() {
    setSelectedFields(fieldOptions.map((field) => field.id));
  }

  async function downloadExport(format: ExportFormat) {
    setActiveFormat(format);
    setMessage("");
    setIsOpen(false);

    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("format", format);

      if (createdFrom.trim()) {
        params.set("createdFrom", createdFrom.trim());
      } else {
        params.delete("createdFrom");
      }

      if (createdTo.trim()) {
        params.set("createdTo", createdTo.trim());
      } else {
        params.delete("createdTo");
      }

      params.delete("fields");
      if (selectedFields.length > 0 && selectedFields.length < fieldOptions.length) {
        selectedFields.forEach((fieldId) => params.append("fields", fieldId));
      }

      const response = await fetch(`/api/admin/leads/export?${params.toString()}`, {
        method: "GET",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(payload?.error ?? "This export could not be completed.");
        setActiveFormat(null);
        return;
      }

      const blob = await response.blob();
      const fallbackName = `leads-desk-leads.${format}`;
      const fileName = getFilenameFromDisposition(
        response.headers.get("content-disposition"),
        fallbackName,
      );

      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      setMessage("This export could not be completed.");
    } finally {
      setActiveFormat(null);
    }
  }

  return (
    <div className="relative space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="admin-button-secondary inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Download className="h-4 w-4" />
        {activeFormat ? `Exporting ${activeFormat.toUpperCase()}...` : "Export leads"}
        <ChevronDown className={cn("h-4 w-4 transition", isOpen && "rotate-180")} />
      </button>

      {isOpen ? (
        <div className="ld-glass-panel absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(30rem,calc(100vw-2rem))] rounded-[24px] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Export leads</p>
              <p className="text-xs leading-5 text-white/58">
                Use the current leads view, adjust the date range if needed, and choose the columns you want.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Created from</span>
                <input
                  type="date"
                  value={createdFrom}
                  onChange={(event) => setCreatedFrom(event.target.value)}
                  className="admin-input h-11 w-full rounded-[18px] px-4 text-sm outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Created to</span>
                <input
                  type="date"
                  value={createdTo}
                  onChange={(event) => setCreatedTo(event.target.value)}
                  className="admin-input h-11 w-full rounded-[18px] px-4 text-sm outline-none"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">Columns</p>
                  <p className="text-xs leading-5 text-white/54">
                    Leave this as it is if you want the standard export.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectDefaultFields}
                    className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/24 hover:text-white"
                  >
                    Default
                  </button>
                  <button
                    type="button"
                    onClick={selectAllFields}
                    className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/24 hover:text-white"
                  >
                    All fields
                  </button>
                </div>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {groupedFieldOptions.map(([group, fields]) => (
                  <div key={group} className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">{group}</p>
                    <div className="grid gap-2">
                      {fields.map((field) => {
                        const checked = selectedFields.includes(field.id);
                        return (
                          <label
                            key={field.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition",
                              checked
                                ? "border-white/18 bg-white/[0.08] text-white"
                                : "border-white/8 bg-white/[0.03] text-white/72 hover:border-white/16 hover:text-white",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleField(field.id)}
                              className="h-4 w-4 rounded border-white/20 bg-transparent"
                            />
                            <span>{field.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={activeFormat !== null}
                onClick={() => void downloadExport("csv")}
                className="admin-button-primary inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold disabled:cursor-wait disabled:opacity-70"
              >
                Download CSV
              </button>
              <button
                type="button"
                disabled={activeFormat !== null}
                onClick={() => void downloadExport("xlsx")}
                className="admin-button-secondary inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium disabled:cursor-wait disabled:opacity-70"
              >
                Download XLSX
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {message ? <p className="text-right text-xs text-white/58">{message}</p> : null}
    </div>
  );
}

