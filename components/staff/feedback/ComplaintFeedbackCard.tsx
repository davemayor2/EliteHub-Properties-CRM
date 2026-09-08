'use client';

import React from 'react';
import { Star, MessageSquare, AlertTriangle, CheckCircle2, Clock, ThumbsDown, ThumbsUp } from 'lucide-react';
import { CustomerFeedbackRecord } from '@/types/feedback';

interface ComplaintFeedbackCardProps {
  feedback?: CustomerFeedbackRecord | null;
  status: string;
}

const RATING_LABELS: Record<number, { label: string; desc: string; isLow: boolean }> = {
  1: { label: 'Very Dissatisfied', desc: 'Significantly below customer expectations', isLow: true },
  2: { label: 'Dissatisfied', desc: 'Did not fully resolve customer issue', isLow: true },
  3: { label: 'Neutral', desc: 'Acceptable resolution', isLow: false },
  4: { label: 'Satisfied', desc: 'Good resolution and team support', isLow: false },
  5: { label: 'Very Satisfied', desc: 'Outstanding service and care', isLow: false },
};

export default function ComplaintFeedbackCard({ feedback, status }: ComplaintFeedbackCardProps) {
  const isResolvedOrClosed = status === 'resolved' || status === 'closed';

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  // State 1: Feedback Submitted
  if (feedback && feedback.submitted_at && feedback.rating) {
    const ratingInfo = RATING_LABELS[feedback.rating] || { label: 'Rated', desc: '', isLow: false };
    const isLowSatisfaction = feedback.rating <= 2;

    return (
      <div className={`staff-section-card feedback-summary-card ${isLowSatisfaction ? 'border-rose-300' : ''}`} role="region" aria-label="Customer Feedback">
        <div className="section-card-header">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className={`header-icon-pill ${isLowSatisfaction ? 'icon-pill-red' : 'icon-pill-gold'}`}>
                {isLowSatisfaction ? <ThumbsDown size={17} /> : <Star size={17} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="section-card-title">Customer Feedback</h3>
                  <span className="badge-feedback-submitted">
                    <CheckCircle2 size={11} className="inline mr-0.5 text-emerald-600" />
                    Submitted
                  </span>
                </div>
                <p className="section-card-subtitle">
                  Received {formatDate(feedback.submitted_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
              <span className="text-base font-bold text-slate-900">{feedback.rating}</span>
              <span className="text-xs text-slate-600">/ 5</span>
            </div>
          </div>
        </div>

        {/* Low Satisfaction Banner if Rating <= 2 */}
        {isLowSatisfaction && (
          <div className="feedback-low-alert-banner">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-rose-900 text-xs">Low Customer Satisfaction Alert</p>
              <p className="text-xs text-rose-700 mt-0.5">
                The customer rated their resolution experience {feedback.rating} / 5 ({ratingInfo.label}). Review recommended.
              </p>
            </div>
          </div>
        )}

        {/* Rating Stars & Verbal Label */}
        <div className="p-4 pt-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={18}
                  className={star <= (feedback.rating || 0) ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-800">
              {ratingInfo.label}
            </span>
          </div>

          {/* Customer Comment */}
          {feedback.comment ? (
            <div className="customer-feedback-comment-box">
              <div className="comment-box-header">
                <MessageSquare size={13} className="text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">Customer Comments</span>
              </div>
              <p className="customer-comment-text">
                &ldquo;{feedback.comment}&rdquo;
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600 italic">
              No written comments provided by customer.
            </p>
          )}
        </div>
      </div>
    );
  }

  // State 2: Feedback Requested, Awaiting Response
  if (feedback && !feedback.submitted_at) {
    return (
      <div className="staff-section-card feedback-summary-card" role="region" aria-label="Customer Feedback">
        <div className="section-card-header">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="header-icon-pill icon-pill-gold">
                <Clock size={17} />
              </div>
              <div>
                <h3 className="section-card-title">Customer Feedback</h3>
                <p className="section-card-subtitle">
                  Satisfaction survey sent upon resolution
                </p>
              </div>
            </div>

            <span className="badge-feedback-pending">
              <Clock size={11} className="inline mr-1 text-amber-600" />
              Awaiting Response
            </span>
          </div>
        </div>

        <div className="p-4 pt-2 text-xs text-slate-600">
          <p>
            Feedback invitation was sent to the customer on {formatDate(feedback.created_at)}. Survey response has not yet been submitted.
          </p>
        </div>
      </div>
    );
  }

  // State 3: Not Requested (Complaint active/open)
  return (
    <div className="staff-section-card feedback-summary-card" role="region" aria-label="Customer Feedback">
      <div className="section-card-header">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <div className="header-icon-pill icon-pill-slate">
              <Star size={17} className="text-slate-400" />
            </div>
            <div>
              <h3 className="section-card-title">Customer Feedback</h3>
              <p className="section-card-subtitle">
                Satisfaction survey triggers upon resolution
              </p>
            </div>
          </div>

          <span className="badge-feedback-none">
            Not Requested
          </span>
        </div>
      </div>

      <div className="p-4 pt-2 text-xs text-slate-600">
        <p>
          {isResolvedOrClosed
            ? 'No feedback record requested for this complaint.'
            : 'When this complaint is marked as Resolved or Closed, a single-use satisfaction survey invitation will automatically be sent to the customer.'}
        </p>
      </div>
    </div>
  );
}
