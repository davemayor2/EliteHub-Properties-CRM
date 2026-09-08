'use client';

import React, { useState } from 'react';
import {
  ComplaintRecord,
  ComplaintAttachmentRecord,
  StaffProfileRecord,
  ComplaintMessageRecord,
  ComplaintStatus,
  ComplaintPriority,
} from '@/types/complaint';
import ComplaintDetailsHeader from './ComplaintDetailsHeader';
import CustomerInformation from './CustomerInformation';
import ComplaintDescription from './ComplaintDescription';
import ComplaintAttachments from './ComplaintAttachments';
import ComplaintConversation from './ComplaintConversation';
import ComplaintStatusSelect from './ComplaintStatusSelect';
import PrioritySelect from './PrioritySelect';
import AssignmentSelect from './AssignmentSelect';
import ComplaintMetadata from './ComplaintMetadata';
import InternalNotes from './InternalNotes';
import ActivityTimeline from './ActivityTimeline';
import { ComplaintNoteRecord } from '@/types/note';
import { ComplaintActivityRecord } from '@/types/activity';
import { ComplaintCategoryRecord } from '@/types/category';
import { DepartmentRecord } from '@/types/department';
import CategorySelect from './CategorySelect';
import DepartmentSelect from './DepartmentSelect';
import SlaSummary from './sla/SlaSummary';
import ComplaintFeedbackCard from './feedback/ComplaintFeedbackCard';
import { Sliders } from 'lucide-react';

interface ComplaintDetailWorkspaceProps {
  initialComplaint: ComplaintRecord;
  attachments: ComplaintAttachmentRecord[];
  staffList: StaffProfileRecord[];
  initialMessages: ComplaintMessageRecord[];
  initialNotes?: ComplaintNoteRecord[];
  initialActivity?: ComplaintActivityRecord[];
}

export default function ComplaintDetailWorkspace({
  initialComplaint,
  attachments,
  staffList,
  initialMessages,
  initialNotes = [],
  initialActivity = [],
}: ComplaintDetailWorkspaceProps) {
  const [complaint, setComplaint] = useState<ComplaintRecord>(initialComplaint);

  const handleStatusChange = (newStatus: ComplaintStatus) => {
    setComplaint((prev) => ({
      ...prev,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }));
  };

  const handlePriorityChange = (newPriority: ComplaintPriority) => {
    setComplaint((prev) => ({
      ...prev,
      priority: newPriority,
      updated_at: new Date().toISOString(),
    }));
  };

  const handleAssignChange = (newStaff: StaffProfileRecord | null) => {
    setComplaint((prev) => ({
      ...prev,
      assigned_to: newStaff?.id || null,
      assigned_profile: newStaff,
      updated_at: new Date().toISOString(),
    }));
  };

  const handleCategoryChange = (newCat: ComplaintCategoryRecord | null) => {
    setComplaint((prev) => ({
      ...prev,
      category_id: newCat?.id || null,
      category: newCat,
      updated_at: new Date().toISOString(),
    }));
  };

  const handleDepartmentChange = (newDept: DepartmentRecord | null) => {
    setComplaint((prev) => ({
      ...prev,
      department_id: newDept?.id || null,
      department: newDept,
      updated_at: new Date().toISOString(),
    }));
  };

  const handleEscalationSuccess = () => {
    setComplaint((prev) => ({
      ...prev,
      is_escalated: true,
      escalated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  };

  return (
    <div className="complaint-detail-workspace">
      {/* Dynamic Header with Status & Priority Badges */}
      <ComplaintDetailsHeader
        referenceNumber={complaint.reference_number}
        status={complaint.status}
        priority={complaint.priority}
        createdAt={complaint.created_at}
        categoryName={complaint.category?.name}
        departmentName={complaint.department?.name}
      />

      {/* Two-Column Responsive Grid */}
      <div className="complaint-detail-grid">
        {/* LEFT / MAIN COLUMN */}
        <div className="detail-main-column">
          {/* Customer Information Card */}
          <CustomerInformation
            fullName={complaint.full_name}
            email={complaint.email}
            phone={complaint.phone}
          />

          {/* Complaint Narrative Card */}
          <ComplaintDescription
            subject={complaint.subject}
            description={complaint.description}
          />

          {/* Evidence Attachments Card */}
          <ComplaintAttachments
            complaintId={complaint.id}
            attachments={attachments}
          />

          {/* Structured Case Conversation & Message Composer */}
          <ComplaintConversation
            complaintId={complaint.id}
            customerName={complaint.full_name}
            initialMessages={initialMessages}
            onStatusTransition={handleStatusChange}
          />

          {/* Confidential Internal Staff Notes */}
          <InternalNotes
            complaintId={complaint.id}
            initialNotes={initialNotes}
          />

          {/* Activity Audit Timeline */}
          <ActivityTimeline
            complaintId={complaint.id}
            initialActivity={initialActivity}
          />
        </div>

        {/* RIGHT / SIDEBAR COLUMN (Management Controls & Meta) */}
        <div className="detail-side-column">
          {/* Management Controls Hub Card */}
          <div className="staff-section-card management-hub-card">
            <div className="section-card-header">
              <div className="header-icon-pill">
                <Sliders size={18} />
              </div>
              <div>
                <h3 className="section-card-title">Case Management</h3>
                <p className="section-card-subtitle">Manage workflow, urgency, and routing</p>
              </div>
            </div>

            <div className="management-controls-stack">
              {/* Status Select */}
              <ComplaintStatusSelect
                complaintId={complaint.id}
                currentStatus={complaint.status}
                onStatusChange={handleStatusChange}
              />

              <div className="control-divider" />

              {/* Priority Select */}
              <PrioritySelect
                complaintId={complaint.id}
                currentPriority={complaint.priority}
                onPriorityChange={handlePriorityChange}
              />

              <div className="control-divider" />

              {/* Category Select */}
              <CategorySelect
                complaintId={complaint.id}
                currentCategoryId={complaint.category_id || null}
                currentCategoryName={complaint.category?.name || null}
                onCategoryChange={handleCategoryChange}
                onDepartmentAutoSuggest={(deptId) => {
                  if (deptId) {
                    setComplaint((prev) => ({
                      ...prev,
                      department_id: deptId,
                    }));
                  }
                }}
              />

              <div className="control-divider" />

              {/* Department Select */}
              <DepartmentSelect
                complaintId={complaint.id}
                currentDepartmentId={complaint.department_id || null}
                currentDepartmentName={complaint.department?.name || null}
                onDepartmentChange={handleDepartmentChange}
              />

              <div className="control-divider" />

              {/* Staff Assignment */}
              <AssignmentSelect
                complaintId={complaint.id}
                assignedStaff={complaint.assigned_profile || null}
                staffList={staffList}
                onAssignChange={handleAssignChange}
              />
            </div>
          </div>

          {/* SLA & Escalation Management Hub */}
          <SlaSummary
            complaint={complaint}
            onEscalationSuccess={handleEscalationSuccess}
          />

          {/* Customer Satisfaction Feedback Card */}
          <ComplaintFeedbackCard
            feedback={complaint.feedback}
            status={complaint.status}
          />

          {/* System Record & Metadata Card */}
          <ComplaintMetadata
            complaintId={complaint.id}
            referenceNumber={complaint.reference_number}
            createdAt={complaint.created_at}
            updatedAt={complaint.updated_at}
          />
        </div>
      </div>
    </div>
  );
}
