'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react';

interface StaffErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function StaffError({ error, reset }: StaffErrorProps) {
  useEffect(() => {
    console.error('[Staff Portal Error Boundary]:', error?.message || error);
  }, [error]);

  return (
    <div className="staff-error-container" style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        textAlign: 'center',
        border: '1px solid #fee2e2',
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: '#fef2f2',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <AlertCircle size={26} />
        </div>

        <h2 style={{
          fontSize: '1.35rem',
          fontWeight: '700',
          color: '#0f172a',
          marginBottom: '0.5rem',
        }}>
          Dashboard Workspace Error
        </h2>

        <p style={{
          fontSize: '0.9rem',
          color: '#64748b',
          lineHeight: '1.5',
          marginBottom: '1.75rem',
        }}>
          We encountered an issue while loading this staff workspace view.
        </p>

        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.15rem',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} />
            <span>Reload View</span>
          </button>

          <Link
            href="/staff/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.15rem',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.85rem',
              textDecoration: 'none',
              border: '1px solid #cbd5e1',
            }}
          >
            <LayoutDashboard size={15} />
            <span>Staff Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
