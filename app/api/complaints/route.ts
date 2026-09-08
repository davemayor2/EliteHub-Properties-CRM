import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { ComplaintSubmissionResponse } from '@/types/complaint';
import {
  validateAttachment,
  uploadComplaintAttachment,
  deleteComplaintAttachment,
} from '@/lib/storage';
import { sendComplaintReceivedEmail, sendNewComplaintAlertToCare } from '@/services/email';
import { resolveComplaintRouting } from '@/lib/routing/assignComplaint';
import { getSlaPolicy, calculateDeadlines } from '@/lib/sla';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_REGEX = /^\d{7,15}$/;

export async function POST(request: NextRequest): Promise<NextResponse<ComplaintSubmissionResponse>> {
  try {
    const contentType = request.headers.get('content-type') || '';
    let fullName = '';
    let email: string | null = null;
    let phone = '';
    let categoryId: string | null = null;
    let subject = '';
    let description = '';
    let attachmentFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch (err) {
        console.error('[API /api/complaints] FormData parse error:', err);
        return NextResponse.json(
          { success: false, message: 'Invalid form data submission.' },
          { status: 400 }
        );
      }

      fullName = (formData.get('fullName') as string) || '';
      const emailRaw = formData.get('email') as string | null;
      email = emailRaw && emailRaw.trim() ? emailRaw.trim() : null;
      phone = (formData.get('phone') as string) || '';
      const catRaw = formData.get('categoryId') as string | null;
      categoryId = catRaw && catRaw.trim() ? catRaw.trim() : null;
      subject = (formData.get('subject') as string) || '';
      description = (formData.get('description') as string) || '';

      const fileEntry = formData.get('attachment');
      if (fileEntry instanceof File && fileEntry.size > 0 && fileEntry.name) {
        attachmentFile = fileEntry;
      }
    } else {
      let body: Record<string, unknown>;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid request payload. Please provide valid JSON or FormData.',
          },
          { status: 400 }
        );
      }

      fullName = (body.fullName as string) || '';
      const emailRaw = body.email as string | null | undefined;
      email = emailRaw && typeof emailRaw === 'string' && emailRaw.trim() ? emailRaw.trim() : null;
      phone = (body.phone as string) || '';
      const catRaw = body.categoryId as string | null | undefined;
      categoryId = catRaw && typeof catRaw === 'string' && catRaw.trim() ? catRaw.trim() : null;
      subject = (body.subject as string) || '';
      description = (body.description as string) || '';
    }

    const errors: Record<string, string> = {};

    // 1. Validate full_name
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    // 2. Validate email (optional, but if provided, must be valid)
    if (email) {
      if (!EMAIL_REGEX.test(email)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    // 3. Validate phone
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      errors.phone = 'Phone number is required';
    } else {
      const cleanDigits = phone.replace(/[\s\-\+\(\)]/g, '');
      if (!PHONE_DIGITS_REGEX.test(cleanDigits)) {
        errors.phone = 'Please enter a valid phone number (7 to 15 digits)';
      }
    }

    // 4. Validate category
    let resolvedCategoryId: string | null = null;
    if (categoryId) {
      const { data: catCheck, error: catErr } = await supabaseServer
        .from('complaint_categories')
        .select('id, is_active')
        .eq('id', categoryId)
        .single();

      if (catErr || !catCheck || !catCheck.is_active) {
        errors.categoryId = 'The selected complaint category is invalid or inactive';
      } else {
        resolvedCategoryId = catCheck.id;
      }
    } else {
      errors.categoryId = 'Complaint category is required';
    }

    // 5. Validate subject
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      errors.subject = 'Subject is required';
    }

    // 6. Validate description
    if (!description || typeof description !== 'string' || !description.trim()) {
      errors.description = 'Complaint description is required';
    }

    // 7. Validate attachment if present
    if (attachmentFile) {
      const fileValidation = validateAttachment({
        name: attachmentFile.name,
        size: attachmentFile.size,
        type: attachmentFile.type,
      });

      if (!fileValidation.valid) {
        errors.attachment = fileValidation.error || 'Invalid attachment file';
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed. Please check the provided information.',
          errors,
        },
        { status: 400 }
      );
    }

    // Sanitized values
    const sanitizedFullName = fullName.trim();
    const sanitizedPhone = phone.trim();
    const sanitizedSubject = subject.trim();
    const sanitizedDescription = description.trim();

    // Step 1: Insert complaint record into database
    const { data: complaintData, error: complaintError } = await supabaseServer.rpc('submit_complaint', {
      p_full_name: sanitizedFullName,
      p_phone: sanitizedPhone,
      p_subject: sanitizedSubject,
      p_description: sanitizedDescription,
      p_email: email,
    });

    if (complaintError || !complaintData?.id || !complaintData?.reference_number) {
      console.error('[API /api/complaints DB Error]:', complaintError);
      return NextResponse.json(
        {
          success: false,
          message: 'We were unable to submit your complaint at this time. Please try again.',
        },
        { status: 500 }
      );
    }

    const complaintId = complaintData.id;
    const referenceNumber = complaintData.reference_number;

    // Step 1b: Apply Category, Department, Intelligent Routing, and SLA Policy Deadlines
    try {
      const routing = await resolveComplaintRouting(supabaseServer, resolvedCategoryId);
      const updates: Record<string, any> = {};
      if (resolvedCategoryId) updates.category_id = resolvedCategoryId;
      if (routing.departmentId) updates.department_id = routing.departmentId;
      if (routing.assignedTo) updates.assigned_to = routing.assignedTo;

      // Step 1c: Match SLA Policy based on Priority and Department
      const priority = complaintData.priority || 'normal';
      const slaPolicy = await getSlaPolicy(supabaseServer, {
        priority,
        departmentId: routing.departmentId,
      });

      if (slaPolicy) {
        const createdAt = complaintData.created_at || new Date().toISOString();
        const deadlines = calculateDeadlines(createdAt, slaPolicy);
        updates.sla_policy_id = slaPolicy.id;
        updates.first_response_due_at = deadlines.firstResponseDueAt;
        updates.resolution_due_at = deadlines.resolutionDueAt;
      }

      if (Object.keys(updates).length > 0) {
        await supabaseServer.from('complaints').update(updates).eq('id', complaintId);
      }

      // Log auto assignment activity if assigned
      if (routing.routingStrategy === 'auto' && routing.assignedTo) {
        await supabaseServer.from('complaint_activity').insert({
          complaint_id: complaintId,
          actor_type: 'system',
          activity_type: 'auto_assigned',
          metadata: {
            assigned_to: routing.assignedTo,
            assigned_name: routing.assignedStaffName,
            department_name: routing.departmentName,
            reason: routing.reason,
          },
        });
      }
    } catch (routeErr) {
      console.error('[API /api/complaints Routing/SLA Warning]:', routeErr);
      // Non-fatal: routing or SLA failure never crashes complaint submission
    }
    let uploadedFilePath: string | undefined;
    let attachmentId: string | undefined;

    // Step 2: If an attachment was provided, upload to Supabase Storage and link in database
    if (attachmentFile) {
      const arrayBuffer = await attachmentFile.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      // Upload to private Supabase Storage bucket
      const uploadResult = await uploadComplaintAttachment(
        complaintId,
        fileBuffer,
        attachmentFile.name,
        attachmentFile.type
      );

      if (!uploadResult.success || !uploadResult.filePath) {
        console.error('[API /api/complaints Upload Failure]: Rolling back complaint', complaintId);
        // Rollback: Delete the complaint record so no orphaned complaint without attachment is left
        await supabaseServer.rpc('rollback_complaint_submission', { p_complaint_id: complaintId });

        return NextResponse.json(
          {
            success: false,
            message: 'We were unable to upload your attachment. Please try again.',
          },
          { status: 500 }
        );
      }

      uploadedFilePath = uploadResult.filePath;

      // Link attachment in complaint_attachments table
      const { data: attachRecord, error: attachDbError } = await supabaseServer.rpc('attach_complaint_file', {
        p_complaint_id: complaintId,
        p_file_name: attachmentFile.name,
        p_file_path: uploadedFilePath,
        p_file_type: attachmentFile.type || null,
        p_file_size: attachmentFile.size,
      });

      if (attachDbError) {
        console.error('[API /api/complaints Attachment DB Failure]: Rolling back storage & complaint', attachDbError);
        // Rollback: Remove uploaded storage file and delete complaint record
        await deleteComplaintAttachment(uploadedFilePath);
        await supabaseServer.rpc('rollback_complaint_submission', { p_complaint_id: complaintId });

        return NextResponse.json(
          {
            success: false,
            message: 'We were unable to save your attachment details. Please try again.',
          },
          { status: 500 }
        );
      }

      attachmentId = attachRecord?.id;
    }

    // Step 3: Trigger Complaint Notifications (non-blocking)
    // A. Confirmation email to customer (if email was provided)
    if (email && complaintData.tracking_token) {
      sendComplaintReceivedEmail({
        to: email,
        referenceNumber,
        trackingToken: complaintData.tracking_token,
        customerName: sanitizedFullName,
      }).catch((emailErr) => {
        console.error('[API /api/complaints Customer Email Error]:', emailErr);
      });
    }

    // B. Internal notification email to care@elitehubproperties.com for every new complaint
    if (complaintData.tracking_token) {
      sendNewComplaintAlertToCare({
        complaintId,
        referenceNumber,
        trackingToken: complaintData.tracking_token,
        customerName: sanitizedFullName,
        customerEmail: email,
        customerPhone: sanitizedPhone,
        subject: sanitizedSubject,
        description: sanitizedDescription,
      }).catch((careErr) => {
        console.error('[API /api/complaints Care Alert Error]:', careErr);
      });
    }

    return NextResponse.json(
      {
        success: true,
        referenceNumber,
        id: complaintId,
        trackingToken: complaintData.tracking_token,
        attachmentId,
        attachmentPath: uploadedFilePath,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[API /api/complaints Unexpected Error]:', err);
    return NextResponse.json(
      {
        success: false,
        message: 'We were unable to submit your complaint at this time. Please try again.',
      },
      { status: 500 }
    );
  }
}
