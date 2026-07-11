export const QUICK_SCHEDULE_PRESETS = [
  "later_today",
  "tomorrow",
  "in_3_days",
  "next_week",
] as const;

export type QuickSchedulePreset = (typeof QUICK_SCHEDULE_PRESETS)[number];

function atLocalTime(date: Date, hour: number, minute = 0) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

export function resolveQuickScheduleDate(
  preset: QuickSchedulePreset,
  now = new Date(),
) {
  const next = new Date(now);

  if (preset === "later_today") {
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1_000);
    const fourPm = atLocalTime(now, 16);
    return twoHoursFromNow < fourPm ? fourPm : twoHoursFromNow;
  }

  const dayOffset = preset === "tomorrow" ? 1 : preset === "in_3_days" ? 3 : 7;
  next.setDate(next.getDate() + dayOffset);
  return atLocalTime(next, 10);
}

export function toLocalDateTimeInputValue(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localDateTimeInputToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
