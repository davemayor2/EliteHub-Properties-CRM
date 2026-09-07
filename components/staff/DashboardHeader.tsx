'use client';

import React from 'react';
import { Menu, Calendar } from 'lucide-react';
import { Profile } from '@/types/profile';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  profile: Profile | null;
  onToggleSidebar?: () => void;
  children?: React.ReactNode;
}

export default function DashboardHeader({
  title,
  subtitle,
  profile,
  onToggleSidebar,
  children,
}: DashboardHeaderProps) {
  // Contextual greeting based on local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const firstName = profile?.full_name?.split(' ')[0] || 'Officer';

  return (
    <header className="staff-content-header" role="banner">
      <div className="header-left">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          type="button"
          className="btn-mobile-menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>

        <div className="header-titles">
          <h1 className="header-main-title">{title}</h1>
          <p className="header-sub-greeting">
            {subtitle || (
              <>
                {getGreeting()}, <span className="greeting-name">{firstName}</span>. Here is the latest customer care overview.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="header-right">
        {/* Date Display */}
        <div className="header-date-badge" aria-label={`Current date: ${formattedDate}`}>
          <Calendar size={14} className="date-icon" />
          <span>{formattedDate}</span>
        </div>

        {children}
      </div>
    </header>
  );
}
