'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected runtime error safely without exposing credentials
    console.error('[Global Application Error Boundary]:', error?.message || error);
  }, [error]);

  return (
    <div className="error-boundary-container" style={{
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
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <AlertTriangle size={28} />
        </div>

        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#0f172a',
          marginBottom: '0.75rem',
        }}>
          Something went wrong
        </h1>

        <p style={{
          fontSize: '0.95rem',
          color: '#64748b',
          lineHeight: '1.5',
          marginBottom: '2rem',
        }}>
          An unexpected error occurred while processing your request. Our customer care team has been notified.
        </p>

        <div style={{
          display: 'flex',
          gap: '1rem',
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
              padding: '0.75rem 1.25rem',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
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
            <Home size={16} />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
