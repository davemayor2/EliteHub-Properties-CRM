import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import FeedbackForm from '@/components/feedback/FeedbackForm';
import { ShieldCheck, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Customer Satisfaction Survey | EliteHub Properties Care',
  description: 'Provide your feedback on your complaint resolution experience with EliteHub Properties Customer Care.',
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function CustomerFeedbackPage({ params }: PageProps) {
  const { token } = await params;

  // 1. Validate Token format
  if (!token || typeof token !== 'string' || !token.trim()) {
    return renderErrorCard(
      'Invalid Feedback Link',
      'The feedback link you provided is incomplete or malformed. Please check the link from your email.'
    );
  }

  // 2. Fetch feedback record with complaint reference
  const { data: record, error } = await supabaseServer
    .from('customer_feedback')
    .select(`
      id,
      rating,
      comment,
      submitted_at,
      feedback_token,
      complaint:complaints!customer_feedback_complaint_id_fkey(reference_number, full_name, status)
    `)
    .eq('feedback_token', token.trim())
    .maybeSingle();

  if (error && error.code !== 'PGRST205') {
    console.error('[Feedback Page Query Error]:', error);
  }

  // 3. Link not found
  if (!record) {
    return renderErrorCard(
      'Feedback Link Not Found',
      'This feedback link is invalid, has expired, or was not found in our system. Please check your invitation email or contact Customer Care if you believe this is an error.'
    );
  }

  const complaintData = record.complaint as any;
  const referenceNumber = complaintData?.reference_number || 'EH-Ref';
  const customerName = complaintData?.full_name || 'Valued Customer';

  // 4. Already Submitted State
  if (record.submitted_at) {
    return renderAlreadySubmittedCard(referenceNumber, record.submitted_at, record.rating);
  }

  // 5. Render Active Feedback Form
  return (
    <main className="feedback-page-wrapper">
      <header className="feedback-page-header">
        <div className="feedback-header-inner">
          <div className="feedback-brand-badge">
            <span className="brand-dot" />
            <span>EliteHub Properties Customer Care</span>
          </div>
          <h1 className="feedback-portal-heading">Customer Feedback</h1>
          <p className="feedback-portal-sub">
            Your honest experience helps us raise our standards of service.
          </p>
        </div>
      </header>

      <div className="feedback-content-card">
        <FeedbackForm
          token={token.trim()}
          referenceNumber={referenceNumber}
          customerName={customerName}
        />
      </div>

      <footer className="feedback-page-footer">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Secure, single-use feedback portal • EliteHub Properties Care</span>
        </div>
      </footer>
    </main>
  );
}

function renderErrorCard(title: string, description: string) {
  return (
    <main className="feedback-page-wrapper">
      <div className="feedback-content-card feedback-state-card text-center p-8">
        <div className="state-icon-circle icon-circle-red mx-auto mb-4">
          <AlertTriangle size={32} className="text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
          {description}
        </p>
        <Link href="/" className="btn-feedback-home inline-flex items-center gap-2">
          <ArrowLeft size={14} />
          <span>Go to Customer Care Home</span>
        </Link>
      </div>
    </main>
  );
}

function renderAlreadySubmittedCard(referenceNumber: string, submittedAt: string, rating: number | null) {
  const formattedDate = (() => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(submittedAt));
    } catch {
      return submittedAt;
    }
  })();

  return (
    <main className="feedback-page-wrapper">
      <div className="feedback-content-card feedback-state-card text-center p-8">
        <div className="state-icon-circle icon-circle-emerald mx-auto mb-4">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Feedback Already Received</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto mb-4 leading-relaxed">
          You have already submitted feedback for complaint{' '}
          <strong className="text-slate-800 font-mono">{referenceNumber}</strong> on {formattedDate}.
        </p>
        <p className="text-xs text-slate-600 max-w-sm mx-auto mb-6">
          To maintain survey integrity, feedback can only be submitted once per resolved complaint. Thank you again for your valuable review!
        </p>
        <Link href="/" className="btn-feedback-home inline-flex items-center gap-2">
          <ArrowLeft size={14} />
          <span>Return to Homepage</span>
        </Link>
      </div>
    </main>
  );
}
