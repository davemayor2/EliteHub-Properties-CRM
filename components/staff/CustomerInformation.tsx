import React from 'react';
import { User, Mail, Phone, ExternalLink } from 'lucide-react';

interface CustomerInformationProps {
  fullName: string;
  email: string | null;
  phone: string;
}

export default function CustomerInformation({
  fullName,
  email,
  phone,
}: CustomerInformationProps) {
  return (
    <div className="staff-section-card customer-info-card">
      <div className="section-card-header">
        <div className="header-icon-pill">
          <User size={18} />
        </div>
        <div>
          <h3 className="section-card-title">Customer Information</h3>
          <p className="section-card-subtitle">Verified details submitted by the complainant</p>
        </div>
      </div>

      <div className="customer-info-scroll-wrapper">
        <div className="customer-info-grid">
          {/* Full Name */}
          <div className="customer-field-card">
            <div className="field-icon-circle">
              <User size={16} />
            </div>
            <div className="field-details">
              <span className="field-label">Full Name</span>
              <span className="field-value font-semibold">{fullName}</span>
            </div>
          </div>

          {/* Email Address */}
          <div className="customer-field-card">
            <div className="field-icon-circle">
              <Mail size={16} />
            </div>
            <div className="field-details">
              <span className="field-label">Email Address</span>
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="field-value field-link"
                  title={`Send email to ${email}`}
                >
                  <span>{email}</span>
                  <ExternalLink size={12} className="link-arrow" />
                </a>
              ) : (
                <span className="field-value text-muted">Not provided</span>
              )}
            </div>
          </div>

          {/* Phone Number */}
          <div className="customer-field-card">
            <div className="field-icon-circle">
              <Phone size={16} />
            </div>
            <div className="field-details">
              <span className="field-label">Phone Number</span>
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="field-value field-link"
                title={`Call ${phone}`}
              >
                <span>{phone}</span>
                <ExternalLink size={12} className="link-arrow" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
