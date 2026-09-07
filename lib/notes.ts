import { supabaseServer } from '@/lib/supabase/server';
import { ComplaintNoteRecord } from '@/types/note';

/**
 * Server-side helper to fetch internal notes for a complaint.
 * Notes are strictly internal and only accessible by staff.
 */
export async function getComplaintNotes(complaintId: string): Promise<ComplaintNoteRecord[]> {
  if (!complaintId) return [];

  try {
    const { data, error } = await supabaseServer
      .from('complaint_notes')
      .select(`
        *,
        author_profile:profiles(id, full_name, email, role)
      `)
      .eq('complaint_id', complaintId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[lib/notes getComplaintNotes Error]:', error);
      return [];
    }

    return (data || []) as ComplaintNoteRecord[];
  } catch (err) {
    console.error('[lib/notes getComplaintNotes Exception]:', err);
    return [];
  }
}

/**
 * Server-side helper to create an internal note.
 * Associates the note with the authenticated staff member.
 */
export async function createComplaintNote(
  complaintId: string,
  authorId: string,
  noteText: string
): Promise<{ success: boolean; note?: ComplaintNoteRecord; error?: string }> {
  if (!complaintId || !authorId) {
    return { success: false, error: 'Complaint ID and Author ID are required.' };
  }

  const trimmedNote = noteText?.trim();
  if (!trimmedNote) {
    return { success: false, error: 'Note content cannot be empty.' };
  }

  try {
    const { data, error } = await supabaseServer
      .from('complaint_notes')
      .insert({
        complaint_id: complaintId,
        author_id: authorId,
        note: trimmedNote,
      })
      .select(`
        *,
        author_profile:profiles(id, full_name, email, role)
      `)
      .single();

    if (error || !data) {
      console.error('[lib/notes createComplaintNote Error]:', error);
      return { success: false, error: error?.message || 'Failed to save internal note.' };
    }

    return {
      success: true,
      note: data as ComplaintNoteRecord,
    };
  } catch (err) {
    console.error('[lib/notes createComplaintNote Exception]:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown server error',
    };
  }
}
