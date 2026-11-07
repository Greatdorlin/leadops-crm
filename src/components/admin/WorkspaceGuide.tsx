"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { GuideStep } from "@/lib/crm/workspace-guide";
import { tourProgress } from "@/lib/crm/workspace-tour-progress";
type Guide = {
  completed: boolean;
  userId: string;
  version: number;
  steps: GuideStep[];
};
const key = "ld-workspace-tour";
const eventName = "ld:start-workspace-tour";
async function loadGuide(): Promise<Guide> {
  const r = await fetch("/api/workspace-guide", { cache: "no-store" });
  if (!r.ok)
    throw new Error(
      "The workspace tour could not be loaded. Please try again.",
    );
  return r.json();
}
function launch(step: number) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: step }));
}
export function WorkspaceGuide() {
  const [data, setData] = useState<Guide | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    loadGuide()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[.025] p-6 sm:p-9">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold">Workspace tour</h2>
          <p className="mt-3 text-sm text-white/60">Choose a page below or start with the dashboard.</p>
          <button
            className="admin-button-primary mt-6 inline-flex min-h-12 items-center gap-3 rounded-xl px-5 text-sm"
            disabled={!data}
            onClick={() => launch(0)}
          >
            {data ? "Start guided tour" : "Loading tour…"}
            <ArrowRight className="size-4" />
          </button>
          <p className="mt-3 text-xs text-white/40">
            About 3 minutes · Tailored to your role · Uses your current
            workspace
          </p>
        </div>
      </section>
      {error ? (
        <p role="alert" className="text-sm text-rose-200">
          {error}
          <button
            className="ml-3 underline"
            onClick={() =>
              void loadGuide()
                .then((d) => {
                  setData(d);
                  setError("");
                })
                .catch((e) => setError(e.message))
            }
          >
            Try again
          </button>
        </p>
      ) : null}
      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Choose where to begin
            </h2>
            <p className="mt-2 text-sm text-white/50">
              Each stop takes you to the real page. Nothing is added or changed
              by the tour.
            </p>
          </div>
          <span className="text-xs text-white/40">
            {data?.steps.length ?? "…"} stops
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data?.steps.map((step, i) => (
            <button
              key={`${step.href}-${i}`}
              className="group flex min-w-0 flex-col rounded-2xl border border-white/10 bg-white/[.025] p-5 text-left transition hover:border-white/25 hover:bg-white/[.055]"
              onClick={() => launch(i)}
            >
              <span className="mb-5 flex w-full items-center justify-between">
                <span className="grid size-9 place-items-center rounded-xl border border-white/10 text-xs text-white/45">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <ArrowRight className="size-4 text-white/25 transition group-hover:translate-x-1 group-hover:text-white" />
              </span>
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="mt-2 text-xs leading-6 text-white/50">
                {step.action || step.description}
              </p>
              <span className="mt-5 text-xs text-white/40">{step.label} ↗</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
export function WorkspaceTour() {
  const router = useRouter(),
    pathname = usePathname();
  const [data, setData] = useState<Guide | null>(null),
    [step, setStep] = useState<number | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [rect, setRect] = useState<{
      top: number;
      left: number;
      width: number;
      height: number;
    } | null>(null),
    [ready, setReady] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let active = true;
    let hasProgress = false;
    try { hasProgress = !!sessionStorage.getItem(key); } catch {}
    if (hasProgress) loadGuide()
      .then((d) => {
        if (!active) return;
        setData(d);
        let saved: number | null = null;
        try {
          saved = tourProgress(
            sessionStorage.getItem(key),
            d.userId,
            d.version,
            d.steps.length,
          );
        } catch {}
        setStep(saved);
      })
      .catch(() => {});
    function start(e: Event) {
      const index = (e as CustomEvent<number>).detail;
      loadGuide()
        .then((d) => {
          if (!active) return;
          const n =
            Number.isInteger(index) && index >= 0 && index < d.steps.length
              ? index
              : 0;
          setData(d);
          setCollapsed(false);
          setStep(n);
          setError("");
          try {
            sessionStorage.setItem(
              key,
              JSON.stringify({ userId: d.userId, version: d.version, step: n }),
            );
          } catch {}
          router.push(d.steps[n].href);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }
    window.addEventListener(eventName, start);
    return () => {
      active = false;
      window.removeEventListener(eventName, start);
    };
  }, [router]);
  const current = step !== null ? data?.steps[step] : null;
  useEffect(() => {
    if (step === null || !data || !current) return;
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({ userId: data.userId, version: data.version, step }),
      );
    } catch {}
    // Wait for streamed page content, then track the target during scrolling and resizing.
    let target: HTMLElement | null = null,
      scrolled = false;
    function measure() {
      if (pathname !== current!.href.split("#")[0]) return;
      target =
        (current!.target || "#workspace-content")
          .split(", ")
          .map((selector) => document.querySelector<HTMLElement>(selector))
          .find((element) => element && element.getClientRects().length > 0) ??
        null;
      if (!target || !target.getClientRects().length) return;
      if (!scrolled) {
        scrolled = true;
        target.scrollIntoView({ block: "start", behavior: "instant" });
        heading.current?.focus({ preventScroll: true });
      }
      const r = target.getBoundingClientRect();
      const top = Math.max(90, r.top - 6),
        left = Math.max(8, r.left - 6);
      const bottom = Math.min(window.innerHeight - 210, r.bottom + 6);
      setRect({
        top,
        left,
        width: Math.max(0, Math.min(window.innerWidth - 8, r.right + 6) - left),
        height: Math.max(0, bottom - top),
      });
      setReady(true);
    }
    const observer = new MutationObserver(measure);
    observer.observe(
      document.getElementById("workspace-content") || document.body,
      { childList: true, subtree: true },
    );
    const frame = requestAnimationFrame(() => {
      setRect(null);
      setReady(false);
      measure();
    });
    const timeout = setTimeout(() => {
      observer.disconnect();
      setReady(true);
    }, 5000);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [current, data, step, pathname]);
  function move(n: number) {
    if (!data) return;
    setCollapsed(false);
    setStep(n);
    setError("");
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({ userId: data.userId, version: data.version, step: n }),
      );
    } catch {}
    router.push(data.steps[n].href);
  }
  function close() {
    setStep(null);
    setRect(null);
    try {
      sessionStorage.removeItem(key);
    } catch {}
  }
  async function finish() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/workspace-guide", { method: "POST" });
      if (!r.ok)
        throw new Error(
          "Could not save completion. Try again, or close the tour.",
        );
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    if (step !== null) window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [step]);
  if (!current || step === null || !data || typeof document === "undefined")
    return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70] text-white">
      {rect && rect.height > 24 && !collapsed ? (
        <div
          aria-hidden="true"
          className="absolute rounded-2xl border-2 border-sky-300/80 shadow-[0_0_0_9999px_rgba(0,0,0,.22)]"
          style={rect}
        />
      ) : null}
      <section
        role="region"
        aria-label="Workspace tour"
        className="pointer-events-auto absolute bottom-3 left-3 right-3 max-h-[min(calc(100svh-90px),380px)] overflow-y-auto rounded-2xl border border-white/20 bg-[#101720]/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-5 sm:left-auto sm:right-5 sm:w-[400px] sm:p-5"
      >
        <div className="flex items-center gap-2">
          <p className="flex-1 text-[11px] font-medium uppercase tracking-wider text-white/50">
            Workspace tour · {step + 1} / {data.steps.length}
          </p>
          <button
            aria-label={collapsed ? "Expand tour" : "Minimize tour"}
            className="min-h-8 px-2 text-xs text-white/60"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? "Expand" : "Minimize"}
          </button>
          <button
            aria-label="Close tour"
            className="grid size-8 place-items-center rounded-lg hover:bg-white/10"
            onClick={close}
          >
            <X className="size-4" />
          </button>
        </div>
        {!collapsed ? (
          <>
            <div className="my-3 flex gap-1" aria-hidden="true">
              {data.steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-0.5 flex-1 rounded-full ${i <= step ? "bg-sky-300" : "bg-white/10"}`}
                />
              ))}
            </div>
            <h2
              ref={heading}
              tabIndex={-1}
              className="text-lg font-semibold tracking-tight outline-none"
            >
              {current.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              {current.description}
            </p>
            <p className="mt-3 flex gap-2 text-xs leading-5 text-sky-100/75">
              {pathname !== current.href ? (
                <>
                  Open this stop to continue.{" "}
                  <button
                    className="shrink-0 underline"
                    onClick={() => router.push(current.href)}
                  >
                    Go to page
                  </button>
                </>
              ) : !ready ? (
                "Opening the page…"
              ) : (
                current.action
              )}
            </p>
          </>
        ) : (
          <p className="mt-2 truncate text-sm font-medium">{current.title}</p>
        )}
        {error ? (
          <p role="alert" className="mt-2 text-xs text-rose-200">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <Link
            href="/settings/guide"
            onClick={close}
            className="min-h-10 content-center text-xs text-white/50 underline underline-offset-4"
          >
            All stops
          </Link>
          <div className="flex gap-2">
            <button
              className="flex min-h-10 items-center gap-1 rounded-lg border border-white/15 px-3 text-xs disabled:opacity-30"
              disabled={step === 0 || busy}
              onClick={() => move(step - 1)}
            >
              <ChevronLeft className="size-3.5" />
              Back
            </button>
            <button
              className="flex min-h-10 items-center gap-2 rounded-lg bg-sky-200 px-4 text-xs font-semibold text-slate-950 disabled:opacity-50"
              disabled={busy}
              onClick={() =>
                step + 1 < data.steps.length ? move(step + 1) : void finish()
              }
            >
              {busy
                ? "Saving…"
                : step + 1 === data.steps.length
                  ? "Finish tour"
                  : "Next"}
              {step + 1 === data.steps.length ? (
                <Check className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
