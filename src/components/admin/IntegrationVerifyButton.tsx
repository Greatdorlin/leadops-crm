"use client";

import { CheckCircle2, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

interface VerificationResponse {
  configured?: boolean;
  verified?: boolean;
  message?: string;
  accountName?: string;
  error?: string;
}

export function IntegrationVerifyButton({
  provider,
  disabled = false,
  previewMode = false,
}: {
  provider: string;
  disabled?: boolean;
  previewMode?: boolean;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<VerificationResponse | null>(null);

  async function verify() {
    if (previewMode) {
      setResult({
        configured: false,
        verified: false,
        message: "Demo mode does not contact provider accounts.",
      });
      return;
    }

    setIsRunning(true);
    setResult(null);
    try {
      const response = await fetch(`/api/integrations/${provider}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as VerificationResponse | null;
      setResult(
        payload ?? {
          configured: false,
          verified: false,
          message: "Verification returned no result.",
        },
      );
    } catch {
      setResult({
        configured: true,
        verified: false,
        message: "The provider could not be reached. No credentials were changed.",
      });
    } finally {
      setIsRunning(false);
    }
  }

  const ResultIcon = result?.verified
    ? CheckCircle2
    : result
      ? TriangleAlert
      : ShieldCheck;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void verify()}
        disabled={disabled || isRunning}
        className="admin-button-primary inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold sm:w-auto"
      >
        {isRunning ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        )}
        {isRunning ? "Checking securely..." : "Verify connection"}
      </button>
      {result ? (
        <div
          role="status"
          className={cn(
            "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-5",
            result.verified
              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-50"
              : "border-amber-300/20 bg-amber-400/10 text-amber-50",
          )}
        >
          <ResultIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">
              {result.verified ? "Connection verified." : "Not verified yet."}
            </span>{" "}
            {result.message || result.error}
            {result.accountName ? ` Account: ${result.accountName}.` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
