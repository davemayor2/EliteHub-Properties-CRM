'use client';

import React from 'react';
import HeroHeading from '@/components/HeroHeading';

export default function Hero() {
  return (
    <section className="hero-section" aria-labelledby="hero-heading">
      <HeroHeading className="hero-title" />
      <p className="hero-subtitle">
        Your concerns matter to us. Share the details of your complaint, and our dedicated customer service team will review and work towards resolving it as quickly as possible.
      </p>
    </section>
  );
}
