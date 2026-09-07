'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Hash, Copy, Check, Database } from 'lucide-react';

interface ComplaintMetadataProps {
  complaintId: string;
  referenceNumber: string;
  createdAt: string;
  updatedAt: string;
}

export default function ComplaintMetadata({
  complaintId,
  referenceNumber,
  createdAt,
  updatedAt,
}: ComplaintMetadataProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const formatFullDate = (dateStr: string) => {
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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  return (
    <div className="staff-section-card metadata-card">
      <div className="section-card-header">
        <div className="header-icon-pill">
          <Database size={16} />
        </div>
        <div>
          <h3 className="section-card-title">System Record & Metadata</h3>
          <p className="section-card-subtitle">Immutable audit identifiers and timestamps</p>
        </div>
      </div>

      <div className="metadata-rows-list">
        {/* Reference Number */}
        <div className="metadata-item-row">
          <div className="metadata-label-group">
            <Hash size={14} className="meta-row-icon" />
            <span className="metadata-label">Tracking Reference</span>
          </div>
          <div className="metadata-value-group">
            <code className="meta-code-val">{referenceNumber}</code>
            <button
              type="button"
              onClick={() => handleCopy(referenceNumber, 'ref')}
              className="btn-mini-copy"
              title="Copy reference number"
            >
              {copiedField === 'ref' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* Database UUID */}
        <div className="metadata-item-row">
          <div className="metadata-label-group">
            <Database size={14} className="meta-row-icon" />
            <span className="metadata-label">Internal Record ID</span>
          </div>
          <div className="metadata-value-group">
            <code className="meta-code-val meta-uuid" title={complaintId}>
              {complaintId.slice(0, 8)}...{complaintId.slice(-4)}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(complaintId, 'id')}
              className="btn-mini-copy"
              title="Copy UUID"
            >
              {copiedField === 'id' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* Created At */}
        <div className="metadata-item-row">
          <div className="metadata-label-group">
            <Calendar size={14} className="meta-row-icon" />
            <span className="metadata-label">Created Date</span>
          </div>
          <span className="metadata-date-val">{formatFullDate(createdAt)}</span>
        </div>

        {/* Updated At */}
        <div className="metadata-item-row">
          <div className="metadata-label-group">
            <Clock size={14} className="meta-row-icon" />
            <span className="metadata-label">Last Updated</span>
          </div>
          <span className="metadata-date-val">{formatFullDate(updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}
