export interface DashboardMetricCard {
  key: string;
  label: string;
  value: string | number;
  trend: string | null;
  hint: string | null;
  href: string | null;
}

export interface SalesPerformanceSummary {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  overdueFollowUps: number;
  stuckLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  estimatedPipelineValue: number;
  wonValue: number;
  targetProgressPercent: number;
}

export interface RepPerformanceSummary {
  userId: string;
  userName: string;
  assignedLeads: number;
  contactedLeads: number;
  overdueFollowUps: number;
  wonLeads: number;
  wonValue: number;
  conversionRate: number;
}

export interface SourcePerformanceSummary {
  sourceId: string;
  sourceLabel: string;
  totalLeads: number;
  wonLeads: number;
  wonValue: number;
  conversionRate: number;
}
