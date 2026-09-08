export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export interface CustomerFeedbackRecord {
  id: string;
  complaint_id: string;
  rating: FeedbackRating | null;
  comment: string | null;
  feedback_token: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackSubmissionPayload {
  rating: number;
  comment?: string | null;
}

export interface FeedbackPublicData {
  token: string;
  referenceNumber: string;
  customerName?: string;
  alreadySubmitted: boolean;
  submittedAt?: string | null;
  currentRating?: number | null;
}

export interface RatingDistributionItem {
  stars: FeedbackRating;
  label: string;
  count: number;
  percentage: number;
}

export interface DepartmentSatisfactionItem {
  departmentId: string;
  departmentName: string;
  avgRating: number;
  totalResponses: number;
  satisfiedPercentage: number;
}

export interface FeedbackAnalyticsMetrics {
  totalRequested: number;
  totalSubmitted: number;
  responseRate: number; // percentage e.g. 42%
  responseRateFormatted: string;
  avgRating: number | null; // e.g. 4.3
  avgRatingFormatted: string; // e.g. "4.3 / 5"
  satisfactionRate: number; // ratings 4 or 5 / total * 100
  satisfactionRateFormatted: string;
  dissatisfactionRate: number; // ratings 1 or 2 / total * 100
  dissatisfactionRateFormatted: string;
  lowSatisfactionCount: number;
  ratingDistribution: RatingDistributionItem[];
  departmentSatisfaction: DepartmentSatisfactionItem[];
}
