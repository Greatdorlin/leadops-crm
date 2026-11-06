"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminOverlayPortal } from "./AdminOverlayPortal";
import type { GuideStep } from "@/lib/crm/workspace-guide";
export function WorkspaceGuide({ automatic = false }: { automatic?: boolean }) {
  const [data, setData] = useState<{
      completed: boolean;
      steps: GuideStep[];
    } | null>(null),
    [open, setOpen] = useState(false),
    [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/workspace-guide", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("The workspace guide is not available yet.");
        return r.json();
      })
      .then((d) => {
        if (active) {
          setData(d);
          if (automatic && !d.completed) setOpen(true);
        }
      })
      .catch((e) => {
        if (active && !automatic) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [automatic]);
  async function finish() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/workspace-guide", { method: "POST" });
      if (!r.ok)
        throw new Error("Your progress could not be saved. Please try again.");
      setOpen(false);
      setStep(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const current = data?.steps[step];
  return (
    <>
      {!automatic ? (
        <div className="space-y-3">
          <p className="text-sm text-white/65">
            A short walkthrough tailored to your role. It uses your current
            workspace and does not add or change demo records.
          </p>
          <button
            className="admin-button-primary min-h-11 px-5"
            disabled={!data}
            onClick={() => {
              setStep(0);
              setOpen(true);
            }}
          >
            Start workspace guide
          </button>
          {error ? <p role="alert">{error}</p> : null}
        </div>
      ) : null}
      <AdminOverlayPortal
        open={open && !!current}
        onClose={() => void finish()}
      >
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            className="max-h-[calc(100svh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950 p-5 text-white shadow-xl"
          >
            <p
              id="guide-title"
              className="mb-4 text-xs font-medium uppercase tracking-wider text-white/55"
            >
              Your workspace guide · {step + 1} of {data?.steps.length ?? 0}
            </p>
            {current ? (
              <div className="space-y-5 p-1">
                <div>
                  <h3 className="text-xl font-semibold">{current.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    {current.description}
                  </p>
                </div>
                <Link
                  className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
                  href={current.href}
                  onClick={() => setOpen(false)}
                >
                  {current.label}
                </Link>
                <p className="text-xs text-white/55">
                  You can replay the guide from My profile or Settings.
                </p>
                {error ? (
                  <p role="alert" className="text-sm">
                    {error}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <button
                    disabled={busy}
                    className="admin-button-ghost min-h-11 px-3"
                    onClick={() => void finish()}
                  >
                    Skip guide
                  </button>
                  <div className="flex gap-2">
                    {step > 0 ? (
                      <button
                        className="admin-button-secondary min-h-11 px-4"
                        onClick={() => setStep((n) => n - 1)}
                      >
                        Back
                      </button>
                    ) : null}
                    <button
                      disabled={busy}
                      className="admin-button-primary min-h-11 px-5"
                      onClick={() =>
                        step + 1 < (data?.steps.length ?? 0)
                          ? setStep((n) => n + 1)
                          : void finish()
                      }
                    >
                      {busy
                        ? "Saving…"
                        : step + 1 === (data?.steps.length ?? 0)
                          ? "Finish"
                          : "Next"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </AdminOverlayPortal>
    </>
  );
}
