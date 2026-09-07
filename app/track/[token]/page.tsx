import React from 'react';
import { Metadata } from 'next';
import { getComplaintByTrackingToken } from '@/lib/tracking';
import CustomerPortalWorkspace from '@/components/customer/CustomerPortalWorkspace';
import InvalidTrackingLink from '@/components/customer/InvalidTrackingLink';

interface TrackingPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: TrackingPageProps): Promise<Metadata> {
  const { token } = await params;
  try {
    const complaint = await getComplaintByTrackingToken(token);
    if (complaint?.reference_number) {
      return {
        title: `Complaint ${complaint.reference_number} | EliteHub Properties Customer Care`,
        description: 'Track and review the status of your EliteHub Properties customer complaint.',
      };
    }
  } catch {
    // Fallback
  }

  return {
    title: 'Track Your Complaint | EliteHub Properties Customer Care',
    description: 'Track and review the status of your EliteHub Properties customer complaint.',
  };
}

export default async function CustomerTrackingPage({ params }: TrackingPageProps) {
  const { token } = await params;

  // Retrieve customer-safe complaint view using validated token
  const complaint = await getComplaintByTrackingToken(token);

  // If token is invalid, revoked, or non-existent
  if (!complaint) {
    return <InvalidTrackingLink />;
  }

  return <CustomerPortalWorkspace complaint={complaint} />;
}
