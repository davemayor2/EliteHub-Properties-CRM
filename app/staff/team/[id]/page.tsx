import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getStaffMemberById } from '@/lib/staff/getTeam';
import DashboardHeader from '@/components/staff/DashboardHeader';
import StaffStatusBadge from '@/components/staff/team/StaffStatusBadge';
import StaffRoleBadge from '@/components/staff/team/StaffRoleBadge';
import StaffDetailClientActions from '@/components/staff/team/StaffDetailClientActions';
import {
  ArrowLeft,
  Mail,
  Calendar,
  Clock,
  Briefcase,
  Shield,
  User,
} from 'lucide-react';

interface StaffDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: StaffDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const staff = await getStaffMemberById(id);
  return {
    title: staff ? `${staff.full_name} | Team Management` : 'Staff Profile | EliteHub Properties',
    description: 'Detailed staff account and operational workload review.',
  };
}

export default async function StaffDetailPage({ params }: StaffDetailPageProps) {
  const { id } = await params;

  // Enforce server-side active admin authorization
  const { profile: loggedInAdmin } = await requireAdmin(`/staff/team/${id}`);

  // Fetch staff member record with workload metrics
  const staff = await getStaffMemberById(id);

  if (!staff) {
    notFound();
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="staff-detail-page-container">
      <DashboardHeader
        title={staff.full_name}
        subtitle="Staff Account Details & Workload Overview"
        profile={loggedInAdmin}
      />

      <div className="staff-detail-content-wrapper">
        {/* Back Link */}
        <div className="back-link-wrapper mb-4">
          <Link href="/staff/team" className="btn-back-link">
            <ArrowLeft size={16} />
            <span>Back to Team Directory</span>
          </Link>
        </div>

        {/* Profile Card Header */}
        <div className="staff-section-card profile-overview-card">
          <div className="profile-card-top-row">
            <div className="profile-primary-info">
              <div className={`large-staff-avatar ${!staff.is_active ? 'avatar-inactive' : ''}`}>
                {getInitials(staff.full_name)}
              </div>
              <div className="profile-text-meta">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="profile-heading-name">{staff.full_name}</h2>
                  <StaffRoleBadge role={staff.role} />
                  <StaffStatusBadge isActive={staff.is_active} />
                </div>
                <div className="profile-subtext-line">
                  <Mail size={14} className="text-muted" />
                  <span>{staff.email}</span>
                </div>
              </div>
            </div>

            {/* Interactive Edit / Status Action Buttons */}
            <StaffDetailClientActions initialStaff={staff} />
          </div>

          <div className="profile-divider" />

          {/* Operational & Account Metrics Grid */}
          <div className="profile-metrics-grid">
            <div className="profile-stat-box">
              <div className="stat-icon-wrapper bg-blue-50 text-blue-700 dark:bg-blue-900/30">
                <Briefcase size={18} />
              </div>
              <div>
                <span className="stat-number">{staff.open_complaints_count}</span>
                <span className="stat-label">Active Open Cases</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <div className="stat-icon-wrapper bg-slate-50 text-slate-700 dark:bg-slate-800">
                <Briefcase size={18} />
              </div>
              <div>
                <span className="stat-number">{staff.assigned_complaints_count}</span>
                <span className="stat-label">Total Lifetime Assigned</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <div className="stat-icon-wrapper bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30">
                <Calendar size={18} />
              </div>
              <div>
                <span className="stat-date">{formatDate(staff.created_at)}</span>
                <span className="stat-label">Date Joined</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <div className="stat-icon-wrapper bg-amber-50 text-amber-700 dark:bg-amber-900/30">
                <Clock size={18} />
              </div>
              <div>
                <span className="stat-date">{formatDate(staff.updated_at)}</span>
                <span className="stat-label">Last Updated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Access Information Card */}
        <div className="staff-section-card mt-6">
          <div className="section-card-header">
            <div className="header-icon-pill">
              <Shield size={18} />
            </div>
            <div>
              <h3 className="section-card-title">Permissions & Security</h3>
              <p className="section-card-subtitle">Role access and active authentication state</p>
            </div>
          </div>

          <div className="security-details-list">
            <div className="security-detail-row">
              <span className="detail-label">System Role:</span>
              <span className="detail-val">
                {staff.role === 'admin'
                  ? 'Administrator (Full permissions: complaints, internal notes, activity logs, team accounts, roles)'
                  : 'Staff Agent (Complaint review, attachments, customer conversations, and internal notes)'}
              </span>
            </div>

            <div className="security-detail-row">
              <span className="detail-label">Login Authorization:</span>
              <span className="detail-val">
                {staff.is_active
                  ? 'Authorized — User can log in to the portal and view complaints.'
                  : 'Deactivated — User cannot log in. Any active sessions are terminated on subsequent requests.'}
              </span>
            </div>

            <div className="security-detail-row">
              <span className="detail-label">Complaint Assignment Eligibility:</span>
              <span className="detail-val">
                {staff.is_active
                  ? 'Eligible — Appears in staff assignment dropdown for new and existing complaints.'
                  : 'Ineligible — Excluded from complaint assignment selection while deactivated.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
