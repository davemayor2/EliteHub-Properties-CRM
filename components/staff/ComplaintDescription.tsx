import React from 'react';
import { FileText, AlignLeft } from 'lucide-react';

interface ComplaintDescriptionProps {
  subject: string;
  description: string;
}

export default function ComplaintDescription({
  subject,
  description,
}: ComplaintDescriptionProps) {
  return (
    <div className="staff-section-card complaint-description-card">
      <div className="section-card-header">
        <div className="header-icon-pill">
          <AlignLeft size={18} />
        </div>
        <div>
          <h3 className="section-card-title">Complaint Details & Narrative</h3>
          <p className="section-card-subtitle">Original issue statement submitted by customer</p>
        </div>
      </div>

      <div className="complaint-subject-block">
        <span className="subject-label">Subject</span>
        <h2 className="subject-heading">{subject}</h2>
      </div>

      <div className="complaint-narrative-block">
        <span className="narrative-label">Detailed Description</span>
        <div className="narrative-content">
          {description.split('\n').map((paragraph, index) => {
            const trimmed = paragraph.trim();
            if (!trimmed) {
              return <div key={index} className="narrative-spacer" />;
            }
            return (
              <p key={index} className="narrative-paragraph">
                {trimmed}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
