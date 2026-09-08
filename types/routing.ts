export interface RoutingResult {
  departmentId: string | null;
  departmentName: string | null;
  assignedTo: string | null;
  assignedStaffName: string | null;
  routingStrategy: 'auto' | 'manual' | 'unassigned';
  reason?: string;
}
