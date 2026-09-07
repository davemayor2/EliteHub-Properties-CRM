import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Hash } from 'lucide-react';

interface CustomerTrackingHeaderProps {
  referenceNumber?: string;
}

export default function CustomerTrackingHeader({
  referenceNumber,
}: CustomerTrackingHeaderProps) {
  return (
    <header className="customer-portal-header">
      <div className="customer-header-inner">
        {/* Brand Logo & Tag */}
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
          <span className="customer-care-pill">
            <ShieldCheck size={13} />
            Official Customer Care
          </span>
        </div>

        {/* Heading & Subtitle */}
        <div className="customer-title-block">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="customer-portal-title">Track Your Complaint</h1>
            {referenceNumber && (
              <div className="header-prominent-ref">
                <Hash size={15} className="text-green-primary" />
                <span className="prominent-ref-val">{referenceNumber}</span>
              </div>
            )}
          </div>
          <p className="customer-portal-subtitle">
            Stay updated and communicate with our customer care team regarding your complaint.
          </p>
        </div>
      </div>
    </header>
  );
}
