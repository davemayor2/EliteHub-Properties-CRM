'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, CheckCircle2, AlertCircle, Send, MessageSquare, ArrowRight } from 'lucide-react';
import { FeedbackRating } from '@/types/feedback';

interface FeedbackFormProps {
  token: string;
  referenceNumber: string;
  customerName?: string;
}

const RATING_OPTIONS: { rating: FeedbackRating; label: string; desc: string }[] = [
  { rating: 1, label: 'Very Dissatisfied', desc: 'Significantly below expectations' },
  { rating: 2, label: 'Dissatisfied', desc: 'Did not fully resolve my issue' },
  { rating: 3, label: 'Neutral', desc: 'Acceptable resolution' },
  { rating: 4, label: 'Satisfied', desc: 'Good resolution and support' },
  { rating: 5, label: 'Very Satisfied', desc: 'Outstanding service and care' },
];

export default function FeedbackForm({ token, referenceNumber, customerName }: FeedbackFormProps) {
  const [selectedRating, setSelectedRating] = useState<FeedbackRating | null>(null);
  const [hoverRating, setHoverRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const activeRating = hoverRating || selectedRating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRating) {
      setErrorMsg('Please select a rating between 1 and 5 stars.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/feedback/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: selectedRating,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Failed to submit feedback. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('[Feedback Submission Error]:', err);
      setErrorMsg('Network error occurred. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="feedback-success-card" role="status" aria-live="polite">
        <div className="feedback-success-icon-wrap">
          <CheckCircle2 size={48} className="text-emerald-600" />
        </div>
        <h2 className="feedback-success-title">Thank You for Your Feedback!</h2>
        <p className="feedback-success-desc">
          Your feedback has been recorded for reference{' '}
          <strong className="text-slate-800 font-mono">{referenceNumber}</strong>. We appreciate you taking the time to help us continually enhance our customer service experience.
        </p>

        <div className="feedback-success-rating-summary">
          <div className="flex items-center gap-1 justify-center my-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={22}
                className={s <= (selectedRating || 0) ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-600">
            {RATING_OPTIONS.find((r) => r.rating === selectedRating)?.label}
          </span>
        </div>

        <div className="feedback-actions-row mt-6">
          <Link href="/" className="btn-feedback-home">
            <span>Return to EliteHub Portal</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="feedback-form-container" noValidate>
      {/* Reference Banner */}
      <div className="feedback-ref-badge">
        <span className="ref-label">Complaint Reference</span>
        <span className="ref-code font-mono">{referenceNumber}</span>
      </div>

      {/* Greeting */}
      <div className="feedback-form-intro">
        <h2 className="feedback-form-heading">How Was Your Experience?</h2>
        <p className="feedback-form-subheading">
          {customerName ? `Hello ${customerName}, please` : 'Please'} rate how our customer care team handled your complaint.
        </p>
      </div>

      {errorMsg && (
        <div className="feedback-error-banner" role="alert">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1-5 Star Rating Selector */}
      <div className="feedback-rating-section">
        <label className="feedback-section-label" id="rating-label">
          Overall Satisfaction <span className="text-rose-500">*</span>
        </label>

        {/* Visual Interactive Stars */}
        <div
          className="feedback-stars-row"
          role="radiogroup"
          aria-labelledby="rating-label"
        >
          {RATING_OPTIONS.map((opt) => {
            const isHovered = hoverRating !== null && opt.rating <= hoverRating;
            const isSelected = selectedRating !== null && opt.rating <= selectedRating;
            const isFilled = isHovered || (hoverRating === null && isSelected);

            return (
              <button
                key={opt.rating}
                type="button"
                role="radio"
                aria-checked={selectedRating === opt.rating}
                aria-label={`${opt.rating} Star - ${opt.label}`}
                className={`feedback-star-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedRating(opt.rating)}
                onMouseEnter={() => setHoverRating(opt.rating)}
                onMouseLeave={() => setHoverRating(null)}
                onFocus={() => setHoverRating(opt.rating)}
                onBlur={() => setHoverRating(null)}
              >
                <Star
                  size={32}
                  className={`star-svg transition-transform ${
                    isFilled ? 'fill-amber-400 text-amber-500 scale-110' : 'text-slate-300 hover:text-amber-300'
                  }`}
                />
                <span className="star-num">{opt.rating}</span>
              </button>
            );
          })}
        </div>

        {/* Active Rating Text Feedback */}
        <div className="feedback-rating-desc-wrap">
          {activeRating ? (
            <div className="rating-desc-pill">
              <span className="font-bold text-slate-800">
                {RATING_OPTIONS[activeRating - 1].label}:
              </span>{' '}
              <span className="text-slate-600">
                {RATING_OPTIONS[activeRating - 1].desc}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-600 italic">
              Select 1 (Very Dissatisfied) to 5 (Very Satisfied)
            </span>
          )}
        </div>
      </div>

      {/* Optional Comments */}
      <div className="feedback-comment-section">
        <label htmlFor="feedback-comment" className="feedback-section-label">
          <MessageSquare size={14} className="inline mr-1 text-slate-500" />
          <span>Tell us more about your experience (optional)</span>
        </label>

        <textarea
          id="feedback-comment"
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 2000))}
          maxLength={2000}
          rows={4}
          className="feedback-textarea"
          placeholder="Your feedback helps us improve our customer service and resolution process..."
        />

        <div className="feedback-char-count">
          <span>{comment.length} / 2,000 characters</span>
        </div>
      </div>

      {/* Submit Button */}
      <div className="feedback-submit-wrap">
        <button
          type="submit"
          disabled={isSubmitting || !selectedRating}
          className="btn-submit-feedback"
        >
          {isSubmitting ? (
            <span>Submitting Feedback...</span>
          ) : (
            <>
              <span>Submit Feedback</span>
              <Send size={15} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
