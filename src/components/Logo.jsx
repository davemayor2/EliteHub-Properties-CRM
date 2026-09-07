import React from 'react';
import logoImg from '../assets/elite-hub-logo.png';

/**
 * EliteHub Properties Logo Component
 * Uses the official EliteHub Properties logo asset with responsive scaling.
 */
export default function Logo({ className = '', height = 38, width = 'auto' }) {
  return (
    <div
      className={`elite-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={logoImg}
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
