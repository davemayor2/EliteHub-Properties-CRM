'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/staff/Sidebar';
import { Profile } from '@/types/profile';

interface SidebarWrapperProps {
  profile: Profile | null;
  newComplaintsCount: number;
  children: React.ReactNode;
}

export default function SidebarWrapper({
  profile,
  newComplaintsCount,
  children,
}: SidebarWrapperProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // If currently on login page, render children directly without dashboard sidebar
  if (pathname === '/staff/login') {
    return <>{children}</>;
  }

  return (
    <div className="staff-app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        profile={profile}
        newComplaintsCount={newComplaintsCount}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="staff-main-viewport">
        {/* Pass down mobile toggle state handler via cloneElement or custom wrapper if needed */}
        <div className="staff-page-content-wrapper">
          {children}
        </div>
      </div>
    </div>
  );
}
