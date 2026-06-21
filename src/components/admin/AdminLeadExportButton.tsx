"use client";

import { ChevronDown, Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

type ExportFormat = "csv" | "xlsx";

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

export function AdminLeadExportButton() {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);
  const [message, setMessage] = useState("");

  async function downloadExport(format: ExportFormat) {
    setActiveFormat(format);
    setMessage("");
    setIsOpen(false);

    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("format", format);

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
        {activeFormat ? `Exporting ${activeFormat.toUpperCase()}...` : "Export sheets"}
        <ChevronDown className={cn("h-4 w-4 transition", isOpen && "rotate-180")} />
      </button>

      {isOpen ? (
        <div className="ld-glass-panel absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[13rem] rounded-[20px] p-2 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
          {([
            { format: "csv", label: "Download CSV" },
            { format: "xlsx", label: "Download XLSX" },
          ] as const).map((option) => (
            <button
              key={option.format}
              type="button"
              disabled={activeFormat !== null}
              onClick={() => void downloadExport(option.format)}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-white/82 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-wait disabled:opacity-70"
            >
              <span>{option.label}</span>
              <span className="text-xs uppercase tracking-[0.14em] text-white/42">
                {option.format}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {message ? <p className="text-right text-xs text-white/58">{message}</p> : null}
    </div>
  );
}
