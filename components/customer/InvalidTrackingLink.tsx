import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SearchX, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function InvalidTrackingLink() {
  return (
    <div className="customer-not-found-wrapper">
      <header className="customer-portal-header">
        <div className="customer-header-inner">
          <div className="customer-brand-row">
            <Link href="/" className="customer-logo-link">
              <Image
                src="/EliteHub Properties logo.png"
                alt="EliteHub Properties"
                width={140}
                height={38}
                priority
                className="customer-logo-img"
              />
            </Link>
          </div>
        </div>
      </header>

      <div className="not-found-card">
        <div className="not-found-icon-circle">
          <SearchX size={32} />
        </div>

        <h2 className="not-found-title">Complaint Not Found</h2>
        <p className="not-found-desc">
          The complaint link you are trying to access is invalid or unavailable.
        </p>

        <div className="not-found-help-box">
          <ShieldAlert size={16} className="text-muted shrink-0" />
          <span className="not-found-help-text">
            Please ensure you copied the complete tracking link provided in your confirmation message.
          </span>
        </div>

        <div className="not-found-actions">
          <Link href="/" className="btn-return-home">
            <ArrowLeft size={15} />
            <span>Return to Customer Care Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
