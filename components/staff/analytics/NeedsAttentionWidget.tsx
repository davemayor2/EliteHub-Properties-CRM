'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Eye, ShieldCheck } from 'lucide-react';
import { ComplaintRecord } from '@/types/complaint';
import SlaStatusBadge from '@/components/staff/sla/SlaStatusBadge';
import PriorityBadge from '@/components/staff/PriorityBadge';
import { evaluateComplaintSla } from '@/lib/sla/checkSlaStatus';

interface NeedsAttentionWidgetProps {
  complaints: ComplaintRecord[];
}

export default function NeedsAttentionWidget({ complaints }: NeedsAttentionWidgetProps) {
  // Filter and sort complaints that need urgent staff attention (overdue, approaching, or escalated)
  const urgentItems = complaints
    .map((c) => ({ complaint: c, sla: evaluateComplaintSla(c) }))
    .filter(({ complaint, sla }) => {
      if (complaint.status === 'resolved' || complaint.status === 'closed') return false;
      return (
        complaint.is_escalated ||
        sla.status === 'overdue' ||
        sla.status === 'first_response_breached' ||
        sla.status === 'resolution_breached' ||
        sla.status === 'approaching_deadline'
      );
    })
    .sort((a, b) => {
      // Escalated first, then overdue, then approaching
      const rank = (item: typeof a) => {
        if (item.complaint.is_escalated) return 1;
        if (
          item.sla.status === 'overdue' ||
          item.sla.status === 'first_response_breached' ||
          item.sla.status === 'resolution_breached'
        ) return 2;
        if (item.sla.status === 'approaching_deadline') return 3;
        return 4;
      };
      return rank(a) - rank(b);
    })
    .slice(0, 6);

  if (urgentItems.length === 0) {
    return (
      <div className="staff-section-card needs-attention-card" role="region" aria-label="Action Items & SLA Warnings">
        <div className="section-card-header">
          <div className="flex items-center gap-3">
            <div className="header-icon-pill icon-pill-emerald">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="section-card-title">Priority & SLA Attention Queue</h3>
              <p className="section-card-subtitle">
                Overdue, approaching deadlines, and escalated complaints
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 text-center text-slate-500 bg-slate-50/50 rounded-xl border border-slate-100 mt-2">
          <ShieldCheck size={32} className="mx-auto text-emerald-500 mb-2" />
          <p className="font-semibold text-slate-800 text-sm">All Active SLAs are On Track!</p>
          <p className="text-xs text-slate-500 mt-0.5">
            No complaints are currently overdue, approaching deadlines, or escalated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-section-card needs-attention-card border-amber-200/80" role="region" aria-label="Action Items & SLA Warnings">
      <div className="section-card-header">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="header-icon-pill icon-pill-red">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="section-card-title">Attention Queue</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  {urgentItems.length} Urgent
                </span>
              </div>
              <p className="section-card-subtitle">
                Active cases with breached, approaching, or escalated SLA deadlines
              </p>
            </div>
          </div>

          <Link
            href="/staff/complaints?sla=overdue"
            className="btn-view-all-link text-rose-700 hover:text-rose-900 font-semibold"
          >
            <span>View All Overdue</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="table-responsive-container mt-3">
        <table className="staff-data-table recent-table" aria-label="Needs attention complaints table">
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Customer</th>
              <th scope="col">Priority</th>
              <th scope="col">SLA Status</th>
              <th scope="col">Urgency Note</th>
              <th scope="col" className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {urgentItems.map(({ complaint, sla }) => (
              <tr key={complaint.id} className={complaint.is_escalated ? 'bg-rose-50/40' : ''}>
                <td>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {complaint.reference_number}
                  </span>
                </td>
                <td>
                  <div className="customer-cell">
                    <span className="customer-name font-medium">{complaint.full_name}</span>
                  </div>
                </td>
                <td>
                  <PriorityBadge priority={complaint.priority} />
                </td>
                <td>
                  <SlaStatusBadge complaint={complaint} />
                </td>
                <td>
                  <span className="text-xs text-slate-600">
                    {complaint.is_escalated
                      ? '⚡ Escalated to Admin'
                      : sla.timeRemainingFormatted || 'Requires immediate review'}
                  </span>
                </td>
                <td className="text-right">
                  <Link
                    href={`/staff/complaints/${complaint.id}`}
                    className="action-btn action-view inline-flex items-center gap-1 text-xs font-medium"
                  >
                    <Eye size={13} />
                    <span>Handle</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
