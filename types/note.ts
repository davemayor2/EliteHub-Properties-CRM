import { StaffProfileRecord } from './complaint';

export interface ComplaintNoteRecord {
  id: string;
  complaint_id: string;
  author_id: string;
  author_profile?: StaffProfileRecord | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotePayload {
  note: string;
}
