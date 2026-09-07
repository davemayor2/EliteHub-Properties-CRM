'use client';

import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, ArrowRight } from 'lucide-react';

interface ComplaintSuccessProps {
  referenceNumber: string;
  onReset: () => void;
}

export default function ComplaintSuccess({ referenceNumber, onReset }: ComplaintSuccessProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referenceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API fails
      setCopied(false);
    }
  };

  return (
    <div className="form-card complaint-success-card" role="region" aria-labelledby="success-title">
      <div className="success-header-wrapper">
        <div className="success-icon-badge" aria-hidden="true">
          <CheckCircle2 size={44} strokeWidth={2.4} />
        </div>

        <h2 id="success-title" className="form-title success-title">
          Complaint Submitted Successfully
        </h2>

        <p className="success-message">
          Thank you for contacting EliteHub Properties Customer Care. Your complaint has been received and our team will review it as soon as possible.
        </p>
      </div>

      {/* Reference Number Box */}
      <div className="reference-box" aria-label="Complaint Reference Details">
        <span className="reference-label">Complaint Reference Number</span>
        <div className="reference-value-row">
          <span className="reference-number" id="complaint-ref-number">
            {referenceNumber}
          </span>
          <button
            type="button"
            className={`btn-copy-ref ${copied ? 'is-copied' : ''}`}
            onClick={handleCopy}
            title={copied ? 'Copied to clipboard' : 'Copy reference number'}
            aria-label="Copy reference number to clipboard"
          >
            {copied ? (
              <>
                <Check size={16} strokeWidth={2.5} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={16} strokeWidth={2} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <p className="reference-note">
          Please keep this reference number for future communication regarding your complaint.
        </p>
      </div>

      {/* Action Button */}
      <div className="success-actions">
        <button
          type="button"
          className="btn-submit-complaint btn-submit-another"
          onClick={onReset}
          aria-label="Submit Another Complaint"
        >
          <span>Submit Another Complaint</span>
          <ArrowRight size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
