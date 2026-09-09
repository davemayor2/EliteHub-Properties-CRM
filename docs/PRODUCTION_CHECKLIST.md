# EliteHub Properties CRM — Production Launch Checklist

This checklist outlines all technical, operational, and infrastructural verifications required prior to opening the EliteHub Properties Customer Care CRM to live customer traffic.

---

## 1. Domain & Network Configuration
- [ ] **Custom Domain Setup**: Ensure production domain `https://care.elitehubproperties.com` is configured with proper DNS records (CNAME / A records).
- [ ] **HTTPS / SSL Certificate**: Confirm active, auto-renewing SSL certificate with strict HSTS enforcement.
- [ ] **Redirects**: Confirm `http://` requests redirect automatically to `https://`.
- [ ] **Next Public URL**: Verify `NEXT_PUBLIC_APP_URL=https://care.elitehubproperties.com` in production environment variables.

---

## 2. Supabase Infrastructure
- [ ] **Production Project**: Ensure the production environment points to the dedicated production Supabase project (`NEXT_PUBLIC_SUPABASE_URL`).
- [ ] **Row Level Security (RLS)**: Verify RLS is enabled on all 11 core tables (`complaints`, `profiles`, `complaint_messages`, `complaint_activity`, `internal_notes`, `departments`, `complaint_categories`, `staff_departments`, `sla_policies`, `customer_feedback`, `complaint_attachments`).
- [ ] **Service Role Key**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set only in secure server-side environment variables and is never exposed to browser bundles.
- [ ] **Storage Bucket**: Ensure `complaint-attachments` bucket is marked **Private** (`public = false`). Direct public file listing must remain disabled.
- [ ] **Database Backups**: Confirm automated daily point-in-time recovery (PITR) or regular scheduled database dumps are active on the Supabase project dashboard.

---

## 3. Email Delivery (Resend)
- [ ] **Verified Sending Domain**: Verify that `elitehubproperties.com` has valid SPF, DKIM, and DMARC DNS records in Resend to ensure emails land in Primary Inboxes rather than Spam.
- [ ] **Sender Address**: Confirm `EMAIL_FROM` is set to `EliteHub Properties Customer Care <care@elitehubproperties.com>`.
- [ ] **Internal Notifications**: Confirm `CARE_NOTIFICATION_EMAIL=care@elitehubproperties.com` is receiving alerts for newly submitted complaints.
- [ ] **API Key**: Ensure `RESEND_API_KEY` is securely set in production environment variables.

---

## 4. Background SLA & Cron Jobs
- [ ] **CRON_SECRET Configured**: Generate a strong random bearer token (64-character hex) and assign it to `CRON_SECRET` in production.
- [ ] **Scheduled Cron Trigger**: Set up an external cron monitor (e.g. Vercel Cron, cPanel Cron, or Cloudflare Worker) to ping `POST /api/cron/sla-check` every 5 to 15 minutes with header `Authorization: Bearer <CRON_SECRET>`.
- [ ] **Idempotency**: Confirm multiple executions do not duplicate SLA warning emails or breach activity logs.

---

## 5. Security & Access Controls
- [ ] **Inactive Staff Lockout**: Confirm deactivated staff members (`is_active = false`) are redirected to `/staff/deactivated` and receive 403 Forbidden from all `/api/staff/*` endpoints.
- [ ] **Internal Confidentiality**: Confirm anonymous customers cannot query internal notes or download internal attachments.
- [ ] **Rate Limiting**: Verify sliding window limits are active for complaint submission (5/15m), customer messaging (12/5m), and feedback (5/15m).
- [ ] **Bot Protection**: Verify off-screen honeypot field catches automated bot scripts on `/`.

---

## 6. Observability & Health Monitoring
- [ ] **Health Endpoint**: Monitor `/api/health` with an uptime monitor (e.g. Better Uptime, UptimeRobot, Pingdom) alerting on non-200 responses.
- [ ] **Error Logs**: Regularly check application server logs for unhandled exceptions or Resend API warnings.
