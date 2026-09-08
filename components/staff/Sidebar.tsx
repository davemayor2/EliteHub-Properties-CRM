'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
import LogoutButton from '@/components/staff/LogoutButton';
import {
  LayoutDashboard,
  Inbox,
  Users,
  Building2,
  Tags,
  Settings,
  Shield,
  X,
  ExternalLink,
} from 'lucide-react';
import { Profile } from '@/types/profile';

interface SidebarProps {
  profile: Profile | null;
  newComplaintsCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  profile,
  newComplaintsCount = 0,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = profile?.role === 'admin';

  const navItems = [
    {
      label: 'Dashboard',
      href: '/staff/dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: 'Complaints',
      href: '/staff/complaints',
      icon: Inbox,
      badge: newComplaintsCount > 0 ? newComplaintsCount : null,
    },
    ...(isAdmin
      ? [
          {
            label: 'Team',
            href: '/staff/team',
            icon: Users,
            badge: null,
          },
          {
            label: 'Departments',
            href: '/staff/settings/departments',
            icon: Building2,
            badge: null,
          },
          {
            label: 'Categories',
            href: '/staff/settings/categories',
            icon: Tags,
            badge: null,
          },
          {
            label: 'Settings',
            href: '/staff/settings',
            icon: Settings,
            badge: null,
          },
        ]
      : []),
  ];

  const fullName = profile?.full_name || 'Staff Member';
  const role = (profile?.role || 'staff').toUpperCase();
  const avatarLetter = fullName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="staff-sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`staff-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Staff Navigation Sidebar">
        {/* Sidebar Header with Brand Logo */}
        <div className="sidebar-header">
          <div className="sidebar-brand-wrapper">
            <Link href="/staff/dashboard" className="sidebar-brand-link" onClick={onClose}>
              <Logo height={34} />
            </Link>
            <span className="sidebar-badge">
              <Shield size={11} />
              <span>Staff Portal</span>
            </span>
          </div>

          {/* Close button for mobile */}
          <button
            type="button"
            className="btn-sidebar-close"
            onClick={onClose}
            aria-label="Close navigation sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav" aria-label="Staff Sections">
          <div className="sidebar-nav-section-title">Navigation</div>
          <ul className="sidebar-nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/staff/dashboard'
                  ? pathname === '/staff/dashboard'
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href} className="sidebar-nav-item">
                  <Link
                    href={item.href}
                    className={`sidebar-nav-link ${isActive ? 'is-active' : ''}`}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={18} className="nav-item-icon" />
                    <span className="nav-item-label">{item.label}</span>

                    {item.badge !== null && (
                      <span className="nav-item-badge" title={`${item.badge} new complaints`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="sidebar-nav-section-title" style={{ marginTop: '24px' }}>
            External Links
          </div>
          <ul className="sidebar-nav-list">
            <li className="sidebar-nav-item">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-nav-link external-link"
              >
                <ExternalLink size={16} className="nav-item-icon" />
                <span className="nav-item-label">Customer Portal</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Sidebar Footer User Profile & Logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">{avatarLetter}</div>
            <div className="sidebar-user-details">
              <span className="sidebar-user-name" title={fullName}>
                {fullName}
              </span>
              <span className={`sidebar-role-pill role-${role.toLowerCase()}`}>
                {role}
              </span>
            </div>
          </div>

          <LogoutButton className="sidebar-logout-btn" />
        </div>
      </aside>
    </>
  );
}
