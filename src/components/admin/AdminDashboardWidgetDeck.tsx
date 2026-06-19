"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  GripVertical,
  MoveDown,
  MoveUp,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "fc-admin-dashboard-widgets-v1";

type DashboardWidget = {
  id: string;
  step: string;
  stepLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  accent?: "warm" | "cool" | "navy";
  ctaHref?: string;
  ctaLabel?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

function reorderList(order: string[], movingId: string, targetId: string) {
  const next = [...order];
  const movingIndex = next.indexOf(movingId);
  const targetIndex = next.indexOf(targetId);

  if (movingIndex === -1 || targetIndex === -1 || movingIndex === targetIndex) {
    return order;
  }

  next.splice(movingIndex, 1);
  next.splice(targetIndex, 0, movingId);
  return next;
}

export function AdminDashboardWidgetDeck({
  widgets,
  initialOrder,
  persistKey = STORAGE_KEY,
}: {
  widgets: DashboardWidget[];
  initialOrder?: string[];
  persistKey?: string | null;
}) {
  const defaultOrder = useMemo(() => widgets.map((widget) => widget.id), [widgets]);
  const [order, setOrder] = useState(() => {
    if (typeof window === "undefined") {
      return initialOrder?.length ? initialOrder : defaultOrder;
    }

    if (!persistKey) {
      return initialOrder?.length ? initialOrder : defaultOrder;
    }

    const saved = window.localStorage.getItem(persistKey);
    if (!saved) {
      return initialOrder?.length ? initialOrder : defaultOrder;
    }

    try {
      const parsed = JSON.parse(saved) as string[];
      const normalized = parsed.filter((id) => defaultOrder.includes(id));
      return normalized.length === defaultOrder.length
        ? normalized
        : initialOrder?.length
          ? initialOrder
          : defaultOrder;
    } catch {
      window.localStorage.removeItem(persistKey);
      return initialOrder?.length ? initialOrder : defaultOrder;
    }
  });
  const [openState, setOpenState] = useState<Record<string, boolean>>(() =>
    widgets.reduce<Record<string, boolean>>((accumulator, widget) => {
      accumulator[widget.id] = widget.defaultOpen ?? true;
      return accumulator;
    }, {}),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (!persistKey) {
      return;
    }

    window.localStorage.setItem(persistKey, JSON.stringify(order));
  }, [order, persistKey]);

  const orderedWidgets = order
    .map((id) => widgets.find((widget) => widget.id === id))
    .filter((widget): widget is DashboardWidget => Boolean(widget));

  const accentClassMap = {
    warm:
      "before:bg-[radial-gradient(circle_at_top_left,rgba(255,189,46,0.18),transparent_34%)]",
    cool:
      "before:bg-[radial-gradient(circle_at_top_left,rgba(120,148,255,0.18),transparent_34%)]",
    navy:
      "before:bg-[radial-gradient(circle_at_top_left,rgba(11,18,63,0.14),transparent_34%)]",
  } as const;

  return (
    <section className="relative overflow-hidden rounded-[40px]">
      <div className="pointer-events-none absolute inset-0 hidden xl:block bg-[radial-gradient(circle_at_18%_18%,rgba(255,190,0,0.13),transparent_26%),radial-gradient(circle_at_82%_16%,rgba(34,82,219,0.1),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0))]" />

      <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0b123f]/44">
            Reorder dashboard
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Move these cards to fit your workflow.
          </p>
        </div>

        <button
          type="button"
            onClick={() => {
              setOrder(defaultOrder);
              if (persistKey) {
                window.localStorage.removeItem(persistKey);
              }
            }}
          className="admin-button-secondary inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
        >
          <RotateCcw className="h-4 w-4" />
          Reset layout
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        {orderedWidgets.map((widget, index) => {
          const isOpen = openState[widget.id] ?? true;
          const accentClass = accentClassMap[widget.accent ?? "warm"];
          const slotClass =
            index === 2 ? "xl:col-span-12" : "xl:col-span-6";
          const isFirst = index === 0;
          const isLast = index === orderedWidgets.length - 1;

          return (
            <article
              key={widget.id}
              draggable
              onDragStart={() => setDraggingId(widget.id)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggingId || draggingId === widget.id) {
                  return;
                }

                setOrder((current) => reorderList(current, draggingId, widget.id));
                setDraggingId(null);
              }}
              className={cn(
                "admin-surface relative overflow-hidden rounded-[34px] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-32 before:opacity-95",
                accentClass,
                slotClass,
                draggingId === widget.id && "cursor-grabbing ring-2 ring-[#cad8ff]",
                draggingId && draggingId !== widget.id && "transition",
              )}
            >
              <div className="relative flex flex-col gap-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7ddf0] bg-white/92 text-sm font-semibold text-[#0b123f] shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                        {widget.step}
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0b123f]/48">
                          {widget.stepLabel}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0b123f]/38">
                          {widget.eyebrow}
                        </p>
                      </div>
                    </div>
                    <h2 className="mt-4 max-w-2xl font-[family:var(--font-heading)] text-[2rem] leading-[0.96] tracking-[-0.06em] text-slate-950 sm:text-[2.35rem]">
                      {widget.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                      {widget.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {widget.ctaHref && widget.ctaLabel ? (
                      <Link
                        href={widget.ctaHref}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/88 px-4 py-2 text-sm font-semibold text-[#0b123f] transition hover:border-slate-300 hover:bg-white"
                      >
                        {widget.ctaLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setOrder((current) => {
                        if (isFirst) {
                          return current;
                        }

                        const next = [...current];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        return next;
                      })}
                      disabled={isFirst}
                      className="admin-icon-button disabled:pointer-events-none disabled:opacity-40"
                      aria-label="Move widget earlier"
                    >
                      <MoveUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrder((current) => {
                        if (isLast) {
                          return current;
                        }

                        const next = [...current];
                        [next[index], next[index + 1]] = [next[index + 1], next[index]];
                        return next;
                      })}
                      disabled={isLast}
                      className="admin-icon-button disabled:pointer-events-none disabled:opacity-40"
                      aria-label="Move widget later"
                    >
                      <MoveDown className="h-4 w-4" />
                    </button>
                    <span
                      className="inline-flex h-11 w-11 cursor-grab items-center justify-center rounded-full border border-slate-200 bg-white/88 text-slate-400 shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
                      aria-label="Drag widget"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenState((current) => ({
                          ...current,
                          [widget.id]: !isOpen,
                        }))
                      }
                      className="admin-icon-button"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? "Collapse widget" : "Expand widget"}
                    >
                      <ChevronDown className={cn("h-4 w-4 transition", isOpen ? "rotate-180" : "")} />
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="rounded-[28px] border border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,255,0.92)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-5">
                    {widget.children}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
