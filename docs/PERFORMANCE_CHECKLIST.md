# EliteHub Properties CRM — Performance & Optimization Checklist

This document details database indexing, query optimization, bundle efficiency, and front-end performance benchmarks for the EliteHub Properties Customer Care CRM.

---

## 1. Database Indexing Matrix
Implemented in migration `20260909120000_phase16_production_hardening.sql`:

| Table | Index Name | Indexed Columns / Predicate | Target Query Pattern |
|---|---|---|---|
| `complaints` | `idx_complaints_status_created_at` | `(status, created_at DESC)` | Staff directory filtering & sorting |
| `complaints` | `idx_complaints_assigned_status` | `(assigned_to, status)` | Workload distribution & agent queues |
| `complaints` | `idx_complaints_dept_cat` | `(department_id, category_id)` | Categorical breakdown & department triage |
| `complaints` | `idx_complaints_reference_number` | `(reference_number)` | Single-record search lookups |
| `complaints` | `idx_complaints_resolution_due_active` | `(resolution_due_at) WHERE status NOT IN ('resolved', 'closed')` | Background SLA breach cron job |
| `complaints` | `idx_complaints_first_response_due_active` | `(first_response_due_at) WHERE first_responded_at IS NULL AND status NOT IN ('resolved', 'closed')` | Background first response warning cron |
| `complaint_messages` | `idx_messages_complaint_created` | `(complaint_id, created_at ASC)` | Conversation thread ordering |
| `complaint_attachments` | `idx_attachments_complaint_vis` | `(complaint_id, visibility)` | Confidential vs public file isolation |
| `customer_feedback` | `idx_feedback_token_submitted` | `(feedback_token, submitted_at)` | Fast single-use token verification |

---

## 2. Front-End & Table Scalability
- **Pagination**:
  - `ComplaintTable.tsx` limits in-memory table rendering to 25 rows per page with intuitive Prev/Next navigation and count summary.
  - Avoids DOM bloat when managing hundreds of complaints.
  - Automatically resets to Page 1 on search or filter adjustments.
- **Client Bundle Separation**:
  - Server components are preserved wherever possible (`app/staff/complaints/page.tsx`, `app/staff/dashboard/page.tsx`).
  - Heavy server utilities (such as `@supabase/ssr` cookies and `crypto` modules) are strictly isolated from client bundles (`lib/attachments/validation.ts`).
- **Standardized Date Formatter**:
  - All timestamps use centralized formatting utilities in `lib/utils/date.ts` to eliminate repetitive ad-hoc `Intl.DateTimeFormat` instantiation on every render.

---

## 3. Background Job Efficiency
- **Partial Index Scans**:
  - The SLA cron job scans only active, unresolved complaints via partial indexes instead of running a full table scan across historical resolved complaints.
- **Stateless Health Checks**:
  - `/api/health` issues a low-overhead query limit 1 probe to verify Supabase responsiveness in under 50ms without generating locks.
