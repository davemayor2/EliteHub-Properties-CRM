import React from 'react';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth/requireStaff';
import DashboardHeader from '@/components/staff/DashboardHeader';
import ComplaintDetailWorkspace from '@/components/staff/ComplaintDetailWorkspace';
import { getComplaintNotes } from '@/lib/notes';
import { getComplaintActivity } from '@/lib/activity';
import {
  ComplaintRecord,
  ComplaintAttachmentRecord,
  StaffProfileRecord,
  ComplaintMessageRecord,
} from '@/types/complaint';
import { Metadata } from 'next';

interface ComplaintDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ComplaintDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Complaint Details | EliteHub Properties Staff Portal`,
    description: 'Detailed customer complaint review and management.',
  };
}

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export default async function ComplaintDetailPage({ params }: ComplaintDetailPageProps) {
  const { id } = await params;
  const isIdUuid = isUuid(id);

  // 1. Verify active staff user (redirects to /staff/deactivated if inactive)
  const { user, profile, supabase } = await requireStaff(`/staff/complaints/${id}`);

  // Resolve complaint UUID if reference number or tracking token was provided in the URL
  let complaintId = id;
  if (!isIdUuid) {
    const { data: refMatch } = await supabase
      .from('complaints')
      .select('id')
      .or(`reference_number.eq.${id},tracking_token.eq.${id}`)
      .maybeSingle();

    if (!refMatch?.id) {
      notFound();
    }
    complaintId = refMatch.id;
  }

  // 2. Fetch complaint record with assigned staff profile, category, department, and SLA policy
  let { data: rawComplaint, error: complaintError } = await supabase
    .from('complaints')
    .select(`
      *,
      assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
      category:complaint_categories(id, name, description, is_active),
      department:departments(id, name, is_active, auto_assign_enabled),
      sla_policy:sla_policies(id, name, first_response_hours, resolution_hours, warning_percentage, auto_escalate)
    `)
    .eq('id', complaintId)
    .maybeSingle();

  if (complaintError || !rawComplaint) {
    const fallback = await supabase
      .from('complaints')
      .select(`
        *,
        assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role),
        category:complaint_categories(id, name, description, is_active),
        department:departments(id, name, is_active, auto_assign_enabled)
      `)
      .eq('id', complaintId)
      .maybeSingle();

    if (fallback.data) {
      rawComplaint = fallback.data;
      complaintError = null;
    } else {
      const basic = await supabase
        .from('complaints')
        .select(`
          *,
          assigned_profile:profiles!complaints_assigned_to_fkey(id, full_name, email, role)
        `)
        .eq('id', complaintId)
        .maybeSingle();

      if (basic.data) {
        rawComplaint = basic.data;
        complaintError = null;
      }
    }
  }

  if (!rawComplaint) {
    notFound();
  }

  // 4. Fetch attachments linked to this complaint
  const { data: rawAttachments } = await supabase
    .from('complaint_attachments')
    .select('*')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true });

  // 5. Fetch all available staff members for assignment dropdown
  const { data: rawStaffList } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name', { ascending: true });

  // 6. Fetch conversation messages linked to this complaint
  const { data: rawMessages } = await supabase
    .from('complaint_messages')
    .select(`
      *,
      sender_profile:profiles(id, full_name, email, role)
    `)
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true });

  // 7. Fetch internal staff notes
  const notes = await getComplaintNotes(complaintId);

  // 8. Fetch audit activity timeline
  const activity = await getComplaintActivity(complaintId);

  // 9. Fetch customer satisfaction feedback if available
  const { data: rawFeedback } = await supabase
    .from('customer_feedback')
    .select('*')
    .eq('complaint_id', complaintId)
    .maybeSingle();

  const complaint: ComplaintRecord = {
    ...(rawComplaint as unknown as ComplaintRecord),
    feedback: rawFeedback || null,
  };
  const attachments: ComplaintAttachmentRecord[] = (rawAttachments || []) as ComplaintAttachmentRecord[];
  const staffList: StaffProfileRecord[] = (rawStaffList || []) as StaffProfileRecord[];
  const messages: ComplaintMessageRecord[] = (rawMessages || []) as ComplaintMessageRecord[];

  return (
    <div className="complaint-detail-page-container">
      {/* Dashboard Top Header */}
      <DashboardHeader
        title={`Complaint ${complaint.reference_number}`}
        subtitle={`Tracking Reference: ${complaint.reference_number}`}
        profile={profile}
      />

      {/* Main Interactive Detail Workspace */}
      <ComplaintDetailWorkspace
        initialComplaint={complaint}
        attachments={attachments}
        staffList={staffList}
        initialMessages={messages}
        initialNotes={notes}
        initialActivity={activity}
      />
    </div>
  );
}
