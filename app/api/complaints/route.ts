import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { ComplaintSubmissionResponse } from '@/types/complaint';
import {
  validateAttachment,
  uploadComplaintAttachment,
  deleteComplaintAttachment,
  MAX_ATTACHMENTS_PER_ACTION,
} from '@/lib/storage';
import { uploadAttachment } from '@/lib/attachments';
import { sendComplaintReceivedEmail, sendNewComplaintAlertToCare } from '@/services/email';
import { resolveComplaintRouting } from '@/lib/routing/assignComplaint';
import { getSlaPolicy, calculateDeadlines } from '@/lib/sla';
import { checkRateLimit, getClientIp, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit/rateLimiter';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_REGEX = /^\d{7,15}$/;

export async function POST(request: NextRequest): Promise<NextResponse<ComplaintSubmissionResponse>> {
  try {
    // 1. IP Rate Limiting (5 requests per 15 minutes per IP)
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`complaint:${clientIp}`, RATE_LIMIT_CONFIGS.complaintSubmission);
    if (!rateLimit.allowed) {
      const retryAfterSec = Math.ceil((rateLimit.resetTimeMs - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `Too many submissions from this connection. Please wait ${Math.ceil(retryAfterSec / 60)} minute(s) before submitting again.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSec),
          },
        }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let fullName = '';
    let email: string | null = null;
    let phone = '';
    let categoryId: string | null = null;
    let subject = '';
    let description = '';
    let attachmentFiles: File[] = [];
    let honeypot: string | null = null;
    let renderTime: number | null = null;

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

      honeypot = formData.get('website') as string | null;
      const rtRaw = formData.get('_renderTime') as string | null;
      renderTime = rtRaw ? parseInt(rtRaw, 10) : null;

      // Collect all attachment files (support both 'attachments' and legacy 'attachment')
      const allFileEntries = [
        ...formData.getAll('attachments'),
        ...formData.getAll('attachment'),
      ];
      for (const entry of allFileEntries) {
        if (entry instanceof File && entry.size > 0 && entry.name) {
          attachmentFiles.push(entry);
        }
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

      honeypot = (body.website as string) || null;
      const rtRaw = body._renderTime as string | number | null | undefined;
      renderTime = rtRaw ? Number(rtRaw) : null;
    }

    // 2. Anti-Spam: Check honeypot field (bots fill this in)
    if (honeypot && honeypot.trim()) {
      console.warn(`[Anti-Spam] Bot detected via honeypot field from IP ${clientIp}`);
      return NextResponse.json(
        { success: false, message: 'Invalid submission request.' },
        { status: 400 }
      );
    }

    // 3. Anti-Spam: Rapid bot submission check (< 1200ms from form mount)
    if (renderTime && Date.now() - renderTime < 1200) {
      console.warn(`[Anti-Spam] Rapid bot submission rejected (${Date.now() - renderTime}ms) from IP ${clientIp}`);
      return NextResponse.json(
        { success: false, message: 'Submission was submitted too rapidly. Please try again.' },
        { status: 400 }
      );
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

    // 7. Validate attachments if present
    if (attachmentFiles.length > MAX_ATTACHMENTS_PER_ACTION) {
      errors.attachment = `You can upload a maximum of ${MAX_ATTACHMENTS_PER_ACTION} files per complaint.`;
    } else {
      for (const file of attachmentFiles) {
        const fileValidation = validateAttachment({
          name: file.name,
          size: file.size,
          type: file.type,
        });

        if (!fileValidation.valid) {
          errors.attachment = `"${file.name}": ${fileValidation.error || 'Invalid attachment file'}`;
          break;
        }
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
    let uploadedCount = 0;
    const uploadedPaths: string[] = [];
    let firstAttachmentId: string | undefined;
    let firstUploadedPath: string | undefined;

    // Step 2: Upload all attachments
    if (attachmentFiles.length > 0) {
      for (const file of attachmentFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        const uploadResult = await uploadAttachment({
          complaintId,
          fileBuffer,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          visibility: 'customer_visible',
          actorType: 'customer',
          actorName: sanitizedFullName,
        });

        if (!uploadResult.success) {
          console.error('[API /api/complaints Upload Failure]: Rolling back complaint', complaintId, uploadResult.error);
          // Rollback: Clean up any files already uploaded and remove complaint
          for (const p of uploadedPaths) {
            await deleteComplaintAttachment(p).catch(() => {});
          }
          await supabaseServer.rpc('rollback_complaint_submission', { p_complaint_id: complaintId });

          return NextResponse.json(
            {
              success: false,
              message: `We were unable to upload "${file.name}". Please try again.`,
            },
            { status: 500 }
          );
        }

        if (uploadResult.attachment?.storage_path) {
          uploadedPaths.push(uploadResult.attachment.storage_path);
          if (!firstAttachmentId && uploadResult.attachment.id) {
            firstAttachmentId = uploadResult.attachment.id;
            firstUploadedPath = uploadResult.attachment.storage_path;
          }
        }
        uploadedCount++;
      }
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
        attachmentId: firstAttachmentId,
        attachmentPath: firstUploadedPath,
        attachmentCount: uploadedCount,
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
