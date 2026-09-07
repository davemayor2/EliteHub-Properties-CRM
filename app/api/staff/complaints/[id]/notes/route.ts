import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getComplaintNotes, createComplaintNote } from '@/lib/notes';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/staff/complaints/[id]/notes
 * Fetches all internal notes for a complaint.
 * Restricted strictly to authenticated staff.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const notes = await getComplaintNotes(id);

    return NextResponse.json({ success: true, notes });
  } catch (err) {
    console.error('[API /api/staff/complaints/[id]/notes GET Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/staff/complaints/[id]/notes
 * Adds a new internal note to a complaint.
 * Restricted strictly to authenticated staff.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: complaintId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawNote = body.note;

    if (!rawNote || typeof rawNote !== 'string' || !rawNote.trim()) {
      return NextResponse.json(
        { success: false, message: 'Note content cannot be empty.' },
        { status: 400 }
      );
    }

    const result = await createComplaintNote(complaintId, user.id, rawNote);

    if (!result.success || !result.note) {
      return NextResponse.json(
        { success: false, message: result.error || 'Failed to save internal note.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      note: result.note,
    });
  } catch (err) {
    console.error('[API /api/staff/complaints/[id]/notes POST Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
