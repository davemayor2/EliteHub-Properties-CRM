import React from 'react';
import Link from 'next/link';
import { HelpCircle, Home, ShieldAlert } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found | EliteHub Properties Customer Care',
  description: 'The requested page could not be found.',
};

export default function NotFound() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      backgroundColor: '#f8fafc',
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '2.5rem 2rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
        textAlign: 'center',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#eff6ff',
          color: '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <HelpCircle size={28} />
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '700',
          color: '#0f172a',
          marginBottom: '0.75rem',
        }}>
          Page Not Found (404)
        </h1>

        <p style={{
          fontSize: '0.95rem',
          color: '#64748b',
          lineHeight: '1.5',
          marginBottom: '2rem',
        }}>
          The page or tracking link you are looking for does not exist, was moved, or has expired.
        </p>

        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
            <Home size={16} />
            <span>Submit a Complaint</span>
          </Link>

          <Link
            href="/staff/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.9rem',
              textDecoration: 'none',
              border: '1px solid #cbd5e1',
            }}
          >
            <ShieldAlert size={16} />
            <span>Staff Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
