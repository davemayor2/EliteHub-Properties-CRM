import { NextRequest, NextResponse } from 'next/server';
import { submitCustomerMessage } from '@/lib/tracking';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token || typeof token !== 'string' || !token.trim()) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing tracking token.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawMessage = body.message;

    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
      return NextResponse.json(
        { success: false, message: 'Message content cannot be empty.' },
        { status: 400 }
      );
    }

    const trimmedMessage = rawMessage.trim();

    // Use server-side tracking helper to validate token and insert customer reply
    const result = await submitCustomerMessage(token, trimmedMessage);

    if (!result.success || !result.message) {
      return NextResponse.json(
        {
          success: false,
          message: result.error || 'Unable to send message. Please verify your tracking link is valid.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      status: result.status,
    });
  } catch (err) {
    console.error('[API /api/track/[token]/messages Unexpected Error]:', err);
    return NextResponse.json(
      { success: false, message: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
