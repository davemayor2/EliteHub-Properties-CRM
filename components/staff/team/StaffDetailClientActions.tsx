'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StaffDetailView } from '@/types/staff';
import EditStaffModal from './EditStaffModal';
import DeactivateStaffDialog from './DeactivateStaffDialog';
import { Edit2, Power } from 'lucide-react';

interface StaffDetailClientActionsProps {
  initialStaff: StaffDetailView;
}

export default function StaffDetailClientActions({
  initialStaff,
}: StaffDetailClientActionsProps) {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffDetailView>(initialStaff);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const handleUpdated = (updated: StaffDetailView) => {
    setStaff(updated);
    router.refresh();
  };

  return (
    <>
      <div className="profile-actions-bar">
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          className="btn-edit-profile"
        >
          <Edit2 size={14} />
          <span>Edit Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setIsStatusOpen(true)}
          className={staff.is_active ? 'btn-deactivate-profile' : 'btn-reactivate-profile'}
        >
          <Power size={14} />
          <span>{staff.is_active ? 'Deactivate' : 'Reactivate'}</span>
        </button>
      </div>

      <EditStaffModal
        isOpen={isEditOpen}
        staff={staff}
        onClose={() => setIsEditOpen(false)}
        onStaffUpdated={handleUpdated}
      />

      <DeactivateStaffDialog
        isOpen={isStatusOpen}
        staff={staff}
        onClose={() => setIsStatusOpen(false)}
        onStatusToggled={handleUpdated}
      />
    </>
  );
}
