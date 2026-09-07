'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  height?: number | string;
  width?: number | string;
}

export default function Logo({ className = '', height = 38, width = 'auto' }: LogoProps) {
  return (
    <div
      className={`elite-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Next.js compatible public asset reference */}
      <img
        src="/elite-hub-logo.png"
        alt="EliteHub Properties Properties Logo"
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          width: typeof width === 'number' ? `${width}px` : width,
          maxWidth: '160px',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
}
