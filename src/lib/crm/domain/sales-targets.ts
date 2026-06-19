export const SALES_TARGET_SCOPES = [
  "global",
  "branch",
  "department",
  "team",
  "user",
] as const;

export const SALES_TARGET_PERIODS = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
] as const;

export type SalesTargetScope = (typeof SALES_TARGET_SCOPES)[number];
export type SalesTargetPeriod = (typeof SALES_TARGET_PERIODS)[number];

export interface SalesTarget {
  id: string;
  name: string;
  scope: SalesTargetScope;
  scopeId: string | null;
  period: SalesTargetPeriod;
  targetValue: number;
  currency: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesTargetProgress {
  targetId: string;
  targetValue: number;
  wonValue: number;
  expectedPipelineValue: number;
  conversionRate: number;
  progressPercent: number;
  remainingValue: number;
  periodStart: string;
  periodEnd: string;
}
