'use client';

import React from 'react';

const PROCESS_STEPS = [
  { stepNumber: 1, text: 'You submit your complaint' },
  { stepNumber: 2, text: 'We receive and review it' },
  { stepNumber: 3, text: 'Our team will contact you' },
  { stepNumber: 4, text: 'We work to resolve it' },
  { stepNumber: 5, text: 'We follow-up to ensure your satisfaction' },
];

export default function ComplaintProcess() {
  return (
    <section className="process-card" aria-labelledby="process-heading">
      <h2 id="process-heading" className="process-title">
        What Happens Next?
      </h2>

      {/* Horizontal Timeline for Desktop / Tablet */}
      <div className="timeline-horizontal" role="list">
        <div className="timeline-track-line" aria-hidden="true" />
        {PROCESS_STEPS.map((step) => (
          <div className="timeline-step" key={step.stepNumber} role="listitem">
            <div className="step-badge" aria-label={`Step ${step.stepNumber}`}>
              {step.stepNumber}
            </div>
            <p className="step-text">{step.text}</p>
          </div>
        ))}
      </div>

      {/* Vertical Timeline for Mobile screens */}
      <div className="timeline-vertical" role="list">
        <div className="timeline-vertical-line" aria-hidden="true" />
        {PROCESS_STEPS.map((step) => (
          <div className="timeline-vertical-step" key={step.stepNumber} role="listitem">
            <div className="step-badge" aria-label={`Step ${step.stepNumber}`}>
              {step.stepNumber}
            </div>
            <p className="step-text">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
