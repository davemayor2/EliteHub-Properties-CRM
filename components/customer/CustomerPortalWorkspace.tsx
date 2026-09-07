'use client';

import React, { useState } from 'react';
import { CustomerComplaintView, CustomerMessageView, ComplaintStatus } from '@/types/complaint';
import CustomerTrackingHeader from './CustomerTrackingHeader';
import ComplaintStatusCard from './ComplaintStatusCard';
import ComplaintSummary from './ComplaintSummary';
import CustomerAttachments from './CustomerAttachments';
import CustomerConversation from './CustomerConversation';
import CustomerMessageComposer from './CustomerMessageComposer';
import { HelpCircle, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

interface CustomerPortalWorkspaceProps {
  complaint: CustomerComplaintView;
}

export default function CustomerPortalWorkspace({
  complaint: initialComplaint,
}: CustomerPortalWorkspaceProps) {
  const [complaintStatus, setComplaintStatus] = useState<ComplaintStatus>(initialComplaint.status);
  const [messages, setMessages] = useState<CustomerMessageView[]>(initialComplaint.messages);

  const handleMessageSent = (
    newMessage: CustomerMessageView,
    updatedStatus?: ComplaintStatus
  ) => {
    setMessages((prev) => [...prev, newMessage]);
    if (updatedStatus) {
      setComplaintStatus(updatedStatus);
    }
  };

  return (
    <div className="customer-portal-container">
      {/* Top Header */}
      <CustomerTrackingHeader referenceNumber={initialComplaint.reference_number} />

      {/* Main Content Width Container */}
      <main className="customer-portal-main">
        {/* Status Card Banner */}
        <ComplaintStatusCard status={complaintStatus} />

        {/* Complaint Summary & Narrative */}
        <ComplaintSummary
          referenceNumber={initialComplaint.reference_number}
          subject={initialComplaint.subject}
          description={initialComplaint.description}
          createdAt={initialComplaint.created_at}
          updatedAt={initialComplaint.updated_at}
        />

        {/* Attachments Section */}
        {initialComplaint.attachments && initialComplaint.attachments.length > 0 && (
          <CustomerAttachments
            token={initialComplaint.tracking_token}
            attachments={initialComplaint.attachments}
          />
        )}

        {/* Conversation Stream */}
        <CustomerConversation messages={messages} />

        {/* Customer Reply Composer */}
        <CustomerMessageComposer
          token={initialComplaint.tracking_token}
          onMessageSent={handleMessageSent}
        />

        {/* Supportive Footer */}
        <div className="customer-portal-footer">
          <div className="footer-support-card">
            <HelpCircle size={18} className="footer-icon" />
            <div className="footer-text-group">
              <span className="footer-title">Need direct assistance?</span>
              <p className="footer-desc">
                You can reach out directly to the EliteHub Properties Customer Care desk.
              </p>
            </div>
            <div className="footer-links-group">
              <a href="mailto:care@elitehubproperties.com" className="footer-link">
                <Mail size={13} />
                <span>care@elitehubproperties.com</span>
              </a>
              <a href="tel:+2348000000000" className="footer-link">
                <Phone size={13} />
                <span>Customer Care Line</span>
              </a>
            </div>
          </div>

          <div className="footer-copyright">
            <span>© {new Date().getFullYear()} EliteHub Properties. All rights reserved.</span>
            <Link href="/" className="footer-home-link">Submit New Complaint</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
