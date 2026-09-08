export interface EscalationPayload {
  reason?: string | null;
}

export interface EscalationResult {
  success: boolean;
  message: string;
  alreadyEscalated?: boolean;
  complaintId?: string;
  escalatedAt?: string;
}
