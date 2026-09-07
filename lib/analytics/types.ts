export type DateRangeOption = 'today' | '7d' | '30d' | 'month' | 'all';

export interface DateRangeBounds {
  range: DateRangeOption;
  label: string;
  startDate: Date | null;
  endDate: Date;
}

export interface DashboardOverviewMetrics {
  total: number;
  new: number;
  open: number;
  pending: number;
  resolved: number;
  closed: number;
  unassigned: number;
  resolutionRate: number;
  periodTotal: number;
  periodResolved: number;
}

export interface TrendDataPoint {
  label: string;
  date: string;
  count: number;
}

export interface DistributionItem {
  label: string;
  key: string;
  count: number;
  percentage: number;
  color: string;
  accentBg: string;
}

export interface ResolutionMetrics {
  resolutionRate: number;
  avgResolutionHours: number | null;
  avgResolutionFormatted: string;
  totalResolvedInPeriod: number;
  totalComplaintsInPeriod: number;
}

export interface StaffWorkloadItem {
  staffId: string;
  fullName: string;
  email: string;
  role: string;
  assignedTotal: number;
  openCount: number;
  pendingCount: number;
  resolvedCount: number;
  closedCount: number;
  activeWorkload: number;
}

export interface MyWorkloadMetrics {
  assignedTotal: number;
  openCount: number;
  pendingCount: number;
  resolvedCount: number;
  closedCount: number;
  activeWorkload: number;
}

export interface RecentActivityDisplayItem {
  id: string;
  complaintId: string;
  referenceNumber: string;
  subject: string;
  activityType: string;
  actorType: 'staff' | 'customer' | 'system';
  actorName: string;
  description: string;
  createdAt: string;
}
