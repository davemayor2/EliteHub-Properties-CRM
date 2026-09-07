'use client';

import React, { useState } from 'react';
import { Hash, Calendar, Clock, Copy, Check, FileText } from 'lucide-react';

interface ComplaintSummaryProps {
  referenceNumber: string;
  subject: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function ComplaintSummary({
  referenceNumber,
  subject,
  description,
  createdAt,
  updatedAt,
}: ComplaintSummaryProps) {
  const [copied, setCopied] = useState(false);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(referenceNumber);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="customer-section-card summary-card">
      {/* Reference Number & Quick Copy */}
      <div className="summary-reference-strip">
        <div className="reference-group">
          <Hash size={16} className="ref-icon" />
          <span className="reference-tag-label">Reference Number:</span>
          <span className="reference-tag-value">{referenceNumber}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyRef}
          className="btn-customer-copy"
          title="Copy reference number"
        >
          {copied ? (
            <>
              <Check size={13} className="text-success" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Case Subject */}
      <div className="summary-subject-section">
        <span className="summary-section-label">Subject</span>
        <h2 className="summary-subject-text">{subject}</h2>
      </div>

      {/* Submitted Details & Narrative */}
      <div className="summary-narrative-section">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={14} className="text-muted" />
          <span className="summary-section-label">Original Complaint Description</span>
        </div>
        <div className="customer-narrative-box">
          {description.split('\n').map((para, i) => {
            const trimmed = para.trim();
            if (!trimmed) return <div key={i} className="narrative-gap" />;
            return (
              <p key={i} className="customer-narrative-para">
                {trimmed}
              </p>
            );
          })}
        </div>
      </div>

      {/* Timestamps */}
      <div className="summary-timestamps-grid">
        <div className="timestamp-item">
          <Calendar size={14} className="timestamp-icon" />
          <div>
            <span className="timestamp-label">Date Submitted</span>
            <span className="timestamp-val">{formatDate(createdAt)}</span>
          </div>
        </div>

        <div className="timestamp-item">
          <Clock size={14} className="timestamp-icon" />
          <div>
            <span className="timestamp-label">Last Activity</span>
            <span className="timestamp-val">{formatDate(updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
