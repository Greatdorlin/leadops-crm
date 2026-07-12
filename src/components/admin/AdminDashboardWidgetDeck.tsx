"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useSyncExternalStore } from "react";
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
import { GlassSurface } from "@/components/admin/ui/GlassSurface";
import { SmoothButton } from "@/components/admin/ui/SmoothButton";
import { InfoTip } from "@/components/admin/ui/InfoTip";

const STORAGE_KEY = "ld-admin-dashboard-widgets-v1";
const ORDER_CHANGE_EVENT = "leads-desk:dashboard-order-change";

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

function subscribeToStoredOrder(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(ORDER_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(ORDER_CHANGE_EVENT, onStoreChange);
  };
}

function readStoredOrder(persistKey: string | null) {
  return persistKey ? window.localStorage.getItem(persistKey) : null;
}

function normalizeStoredOrder(savedOrder: string | null, fallbackOrder: string[]) {
  if (!savedOrder) {
    return fallbackOrder;
  }

  try {
    const parsed = JSON.parse(savedOrder) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      return fallbackOrder;
    }

    const normalized = parsed.filter((id) => fallbackOrder.includes(id));
    return normalized.length === fallbackOrder.length ? normalized : fallbackOrder;
  } catch {
    return fallbackOrder;
  }
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
  const fallbackOrder = initialOrder?.length ? initialOrder : defaultOrder;
  const storedOrder = useSyncExternalStore(
    subscribeToStoredOrder,
    () => readStoredOrder(persistKey),
    () => null,
  );
  const [memoryOrder, setMemoryOrder] = useState(fallbackOrder);
  const order = persistKey
    ? normalizeStoredOrder(storedOrder, fallbackOrder)
    : memoryOrder;
  const [openState, setOpenState] = useState<Record<string, boolean>>(() =>
    widgets.reduce<Record<string, boolean>>((accumulator, widget) => {
      accumulator[widget.id] = widget.defaultOpen ?? true;
      return accumulator;
    }, {}),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function updateOrder(updater: (current: string[]) => string[]) {
    const nextOrder = updater(order);
    if (nextOrder === order) {
      return;
    }

    if (persistKey) {
      window.localStorage.setItem(persistKey, JSON.stringify(nextOrder));
      window.dispatchEvent(new Event(ORDER_CHANGE_EVENT));
      return;
    }

    setMemoryOrder(nextOrder);
  }

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
    <section className="relative min-w-0 rounded-[32px] ld-animate-fade-in-up">
      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-[32px] xl:block bg-[radial-gradient(circle_at_18%_18%,rgba(139,92,246,0.18),transparent_28%),radial-gradient(circle_at_82%_16%,color-mix(in_srgb,var(--ld-color-primary)_12%,transparent),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))]" />

      <div className="ld-glass ld-glass-soft relative mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border-white/10 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <p className="truncate text-sm font-semibold text-white">
            Arrange dashboard
          </p>
          <InfoTip
            label="Move, collapse, or reset these cards. Your order is saved on this device."
            align="left"
          />
        </div>

        <SmoothButton
          type="button"
          variant="ghost"
          size="sm"
          icon={<RotateCcw className="h-4 w-4" />}
          onClick={() => {
            if (persistKey) {
              window.localStorage.removeItem(persistKey);
              window.dispatchEvent(new Event(ORDER_CHANGE_EVENT));
            } else {
              setMemoryOrder(fallbackOrder);
            }
          }}
        >
          Reset layout
        </SmoothButton>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-12">
        {orderedWidgets.map((widget, index) => {
          const isOpen = openState[widget.id] ?? true;
          const useDescriptionTip = widget.description.length > 48;
          const accentClass = accentClassMap[widget.accent ?? "warm"];
          const slotClass =
            index === 2 ? "xl:col-span-12" : "xl:col-span-6";
          const isFirst = index === 0;
          const isLast = index === orderedWidgets.length - 1;

          return (
            <GlassSurface
              as="article"
              key={widget.id}
              intensity="medium"
              border={true}
              draggable
              onDragStart={() => setDraggingId(widget.id)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggingId || draggingId === widget.id) {
                  return;
                }

                updateOrder((current) => reorderList(current, draggingId, widget.id));
                setDraggingId(null);
              }}
              className={cn(
                "relative self-start overflow-hidden rounded-[34px] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.18)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-32 before:opacity-95",
                accentClass,
                slotClass,
                draggingId === widget.id && "cursor-grabbing ring-2 ring-[color:var(--ld-color-accent)]/60",
                draggingId && draggingId !== widget.id && "transition",
                "ld-animate-fade-in-up",
              )}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div className="relative flex flex-col gap-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-gradient-to-br from-white/[0.14] to-white/[0.06] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)] ring-1 ring-white/10">
                        {widget.step}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                          {widget.stepLabel}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                          {widget.eyebrow}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex min-w-0 items-center gap-2.5">
                      <h2 className="min-w-0 max-w-2xl break-words font-[family:var(--font-heading)] text-[1.65rem] leading-[1.1] tracking-[-0.05em] text-white sm:text-[1.9rem]">
                        {widget.title}
                      </h2>
                      {useDescriptionTip ? <InfoTip label={widget.description} align="left" /> : null}
                    </div>
                    {!useDescriptionTip ? (
                      <p className="mt-2 min-w-0 max-w-2xl text-sm leading-6 text-white/70">
                        {widget.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                    {widget.ctaHref && widget.ctaLabel ? (
                      <Link
                        href={widget.ctaHref}
                        className="admin-button-ghost inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm"
                      >
                        {widget.ctaLabel}
                        <ArrowRight className="h-4 w-4 shrink-0" />
                      </Link>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => updateOrder((current) => {
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
                      onClick={() => updateOrder((current) => {
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
                      className="ld-floating-control hidden h-11 w-11 cursor-grab items-center justify-center rounded-full text-white/70 sm:inline-flex"
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
                      <ChevronDown className={cn("h-4 w-4 text-white transition", isOpen ? "rotate-180" : "")} />
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    {widget.children}
                  </div>
                ) : null}
              </div>
            </GlassSurface>
          );
        })}
      </div>
    </section>
  );
}
