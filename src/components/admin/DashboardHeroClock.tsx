"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

function formatDashboardDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(date);
}

function resolveGreeting(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone,
  }).formatToParts(date);
  const hourValue = Number(parts.find((part) => part.type === "hour")?.value ?? "12");

  if (hourValue < 12) {
    return "Good morning";
  }

  if (hourValue < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function DashboardHeroClock({
  initialNowIso,
  name,
  nameClassName,
}: {
  initialNowIso: string;
  name: string;
  nameClassName?: string;
}) {
  const [now, setNow] = useState<Date>(() => new Date(initialNowIso));
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const timeZone = isHydrated
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    : "UTC";

  const greeting = useMemo(() => {
    return isHydrated ? resolveGreeting(now, timeZone) : "Welcome back";
  }, [isHydrated, now, timeZone]);

  const dateLabel = useMemo(() => {
    return `${formatDashboardDate(now, timeZone)} • ${
      isHydrated ? timeZone.replaceAll("_", " ") : "Workspace time"
    }`;
  }, [isHydrated, now, timeZone]);

  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
        {dateLabel}
      </p>
      <h2 className="mt-2 break-words font-[family:var(--font-heading)] text-[2.25rem] leading-[1.08] tracking-[-0.055em] text-white sm:text-[3rem] sm:leading-[1.03]">
        {greeting}, <span className={nameClassName}>{name}</span>.
      </h2>
    </>
  );
}
