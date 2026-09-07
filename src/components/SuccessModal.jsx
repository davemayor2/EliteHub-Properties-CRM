import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function SuccessModal({ isOpen, onClose, formData }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-dialog">
        <div className="modal-icon-circle">
          <CheckCircle2 size={36} strokeWidth={2.5} />
        </div>
        
        <h2 id="modal-title" className="modal-title">
          Complaint Submitted Successfully
        </h2>
        
        <p className="modal-description">
          Thank you, <strong>{formData?.fullName || 'valued client'}</strong>. We have received your complaint regarding <em>&quot;{formData?.subject || 'your request'}&quot;</em>. Our customer service team has been notified and will reach out to you shortly.
        </p>

        <div className="modal-actions">
          <button type="button" className="btn-modal-primary" onClick={onClose}>
            Submit Another Complaint
          </button>
        </div>
      </div>
    </div>
  );
}
