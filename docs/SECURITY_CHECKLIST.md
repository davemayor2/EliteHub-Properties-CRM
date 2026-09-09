# EliteHub Properties CRM — Security Audit Checklist

This document details the security posture, defensive mechanisms, and access control audit results for the EliteHub Properties Customer Care CRM.

---

## 1. Authentication & Session Management
- **Supabase SSR**: Session authentication uses `@supabase/ssr` with HttpOnly, Secure cookie transport.
- **Middleware Revalidation**: `middleware.ts` forces unauthenticated visitors away from `/staff/*` to `/staff/login`.
- **Inactive Staff Lockout**:
  - Web UI: Server Component pages invoke `requireStaff()` which checks `profiles.is_active` and immediately redirects inactive staff to `/staff/deactivated`.
  - API Routes: Route handlers under `app/api/staff/*` invoke `authenticateStaffApi()` or `authenticateAdminApi()`, returning `403 Forbidden` if `is_active === false`.

---

## 2. Authorization & Privilege Boundaries
- **Role Hierarchy**: Strict separation between `'admin'` and `'staff'`.
- **Admin Isolation**: Sensitive administrative actions (staff invitations, role modification, staff deactivation, department assignment, SLA policy modification) are guarded by `authenticateAdminApi()`.
- **Public Customer Isolation**:
  - Customers interact strictly via unguessable, cryptographically secure tracking tokens (`tracking_token`, `feedback_token`).
  - Anonymous users cannot enumerate complaints or query customer records by ID.
  - Zero access to `internal_notes` or `visibility = 'internal'` attachments.

---

## 3. Row Level Security (RLS)
- **Table Coverage**: 100% of tables in `public` schema have RLS enabled.
- **Anonymous Access Denied**: Explicit denial policies prevent anonymous actors from reading internal notes, staff activities, or profiles.
- **RPC Encapsulation**: Customer complaint tracking and feedback submission are mediated by SECURITY DEFINER stored procedures with strict input sanitization.

---

## 4. Input Validation & XSS Defense
- **Zero Raw HTML Injection**: All user-provided fields (names, phones, descriptions, messages, notes) are rendered as plain text in React elements. No `dangerouslySetInnerHTML` is used anywhere in the application.
- **Phone Validation**: Standardized international phone format with E.164 country code selection.
- **Email Validation**: Strict regex verification before sending notifications.
- **File Validation**: MIME whitelist (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `text/plain`), 10MB file size ceiling, 5 files max per action, and aggressive rejection of executables (`.exe`, `.bat`, `.sh`, `.php`, `.py`, `.js`, etc.).
- **Filename Sanitization**: Directory traversal characters (`..`, `/`, `\`) and null bytes are stripped before generating storage keys.

---

## 5. Rate Limiting & Bot Spam Prevention
- **In-Memory Sliding Window**:
  - `complaintsSubmission`: 5 requests / 15 minutes per IP.
  - `trackingLookup`: 45 requests / minute per IP.
  - `customerMessages`: 12 messages / 5 minutes per IP.
  - `feedbackSubmission`: 5 submissions / 15 minutes per IP.
  - `attachmentDownload`: 40 requests / 5 minutes per IP.
- **Invisible Honeypot**: Form includes an off-screen `website` field that traps automated bots while remaining invisible to legitimate human users.
- **Inhuman Timing Check**: Submissions submitted in under 1.2 seconds from form load are flagged and rejected.

---

## 6. HTTP Security Headers
Configured in `next.config.mjs`:
- `X-Frame-Options: DENY` (prevents clickjacking)
- `X-Content-Type-Options: nosniff` (prevents MIME sniffing)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-XSS-Protection: 1; mode=block`
