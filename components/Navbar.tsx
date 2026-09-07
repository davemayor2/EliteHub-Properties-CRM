'use client';

import React from 'react';
import Logo from '@/components/Logo';
import { ArrowRight } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="nav-container" role="banner">
      {/* Brand Logo on Left */}
      <a href="/" className="nav-brand" aria-label="EliteHub Properties Home">
        <Logo width={150} height={38} />
      </a>

      {/* Center Navigation Link */}
      <nav className="nav-center" aria-label="Main Navigation">
        <a
          href="https://elitehubproperties.com"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
        >
          Visit Website
        </a>
      </nav>

      {/* Right Action Button */}
      <div className="nav-right">
        <a
          href="https://elitehubproperties.com/properties"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-properties"
          aria-label="View Properties on EliteHub Properties"
        >
          <span className="btn-label">View Properties</span>
          <span className="arrow-circle">
            <ArrowRight size={14} strokeWidth={2.5} />
          </span>
        </a>
      </div>
    </header>
  );
}
