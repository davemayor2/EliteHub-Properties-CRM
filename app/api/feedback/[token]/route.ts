import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { submitFeedback } from '@/lib/feedback/submitFeedback';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/feedback/[token]
 * Validates the feedback token and returns public details (reference number, submission status).
 * Excludes all sensitive internal CRM information.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token || typeof token !== 'string' || !token.trim()) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing feedback token.' },
        { status: 400 }
      );
    }

    const { data: record, error } = await supabaseServer
      .from('customer_feedback')
      .select(`
        id,
        rating,
        submitted_at,
        complaint:complaints!customer_feedback_complaint_id_fkey(reference_number, full_name)
      `)
      .eq('feedback_token', token.trim())
      .maybeSingle();

    if (error && error.code !== 'PGRST205') {
      console.error('[API /api/feedback/[token] GET Error]:', error);
      return NextResponse.json(
        { success: false, message: 'Unable to verify feedback link.' },
        { status: 500 }
      );
    }

    if (!record) {
      return NextResponse.json(
        { success: false, message: 'This feedback link is invalid or does not exist.' },
        { status: 404 }
      );
    }

    const complaintData = record.complaint as any;

    return NextResponse.json({
      success: true,
      data: {
        token: token.trim(),
        referenceNumber: complaintData?.reference_number || 'EH-Ref',
        customerName: complaintData?.full_name || 'Valued Customer',
        alreadySubmitted: Boolean(record.submitted_at),
        submittedAt: record.submitted_at,
        currentRating: record.rating,
      },
    });
  } catch (err) {
    console.error('[API /api/feedback/[token] GET Exception]:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedback/[token]
 * Submits customer satisfaction rating and optional comments.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token || typeof token !== 'string' || !token.trim()) {
      return NextResponse.json(
        { success: false, message: 'Invalid feedback token.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { rating, comment } = body;

    if (rating === undefined || rating === null) {
      return NextResponse.json(
        { success: false, message: 'Please select a rating between 1 and 5.' },
        { status: 400 }
      );
    }

    const result = await submitFeedback(supabaseServer, {
      token: token.trim(),
      rating: Number(rating),
      comment: typeof comment === 'string' ? comment : undefined,
    });

    if (!result.success) {
      const status = result.alreadySubmitted ? 409 : 400;
      return NextResponse.json(
        { success: false, message: result.error || 'Failed to submit feedback.' },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback! Your response has been recorded.',
      referenceNumber: result.referenceNumber,
    });
  } catch (err) {
    console.error('[API /api/feedback/[token] POST Exception]:', err);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred while saving your feedback.' },
      { status: 500 }
    );
  }
}
