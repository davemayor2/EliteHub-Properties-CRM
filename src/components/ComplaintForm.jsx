import React, { useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import PhoneInput from './PhoneInput';
import FileUpload from './FileUpload';

export default function ComplaintForm({ onSubmitSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    countryCode: '+234',
    phone: '',
    subject: '',
    description: '',
  });

  const [attachment, setAttachment] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field change handlers
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for field on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Client-side validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const cleanPhone = formData.phone.replace(/[\s-]/g, '');
      if (!/^\d{7,15}$/.test(cleanPhone)) {
        newErrors.phone = 'Please enter a valid phone number (digits only)';
      }
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Complaint description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Focus first error field
      const firstErrorKey = Object.keys(errors)[0];
      const element = document.getElementById(firstErrorKey);
      if (element) {
        element.focus();
      }
      return;
    }

    setIsSubmitting(true);

    // Simulate clean frontend submission latency for smooth user feedback
    setTimeout(() => {
      setIsSubmitting(false);
      if (onSubmitSuccess) {
        onSubmitSuccess({
          ...formData,
          fullPhoneNumber: `${formData.countryCode} ${formData.phone}`,
          attachment,
        });
      }
      // Reset form state
      setFormData({
        fullName: '',
        email: '',
        countryCode: '+234',
        phone: '',
        subject: '',
        description: '',
      });
      setAttachment(null);
      setErrors({});
    }, 600);
  };

  return (
    <div className="form-card" aria-labelledby="form-title">
      <h2 id="form-title" className="form-title">
        Complaint Form
      </h2>

      <form className="complaint-form" onSubmit={handleSubmit} noValidate>
        {/* ROW 1: Full Name & Email Address */}
        <div className="form-row-grid">
          {/* Full Name */}
          <div className="form-field">
            <label htmlFor="fullName" className="form-label">
              Full Name <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              className={`form-input ${errors.fullName ? 'has-error' : ''}`}
              placeholder="Type your full name"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              required
              aria-required="true"
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
            />
            {errors.fullName && (
              <div id="fullName-error" className="field-error-msg" role="alert">
                <AlertCircle size={13} />
                <span>{errors.fullName}</span>
              </div>
            )}
          </div>

          {/* Email Address */}
          <div className="form-field">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className={`form-input ${errors.email ? 'has-error' : ''}`}
              placeholder="Type your email address"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <div id="email-error" className="field-error-msg" role="alert">
                <AlertCircle size={13} />
                <span>{errors.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: Phone Number */}
        <div className="form-field">
          <label htmlFor="phone" className="form-label">
            Phone Number <span className="required-asterisk">*</span>
          </label>
          <PhoneInput
            id="phone"
            value={formData.phone}
            onChange={(val) => handleChange('phone', val)}
            countryCode={formData.countryCode}
            onCountryCodeChange={(code) => handleChange('countryCode', code)}
            hasError={!!errors.phone}
            required
          />
          {errors.phone && (
            <div id="phone-error" className="field-error-msg" role="alert">
              <AlertCircle size={13} />
              <span>{errors.phone}</span>
            </div>
          )}
        </div>

        {/* ROW 3: Subject */}
        <div className="form-field">
          <label htmlFor="subject" className="form-label">
            Subject <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            className={`form-input ${errors.subject ? 'has-error' : ''}`}
            placeholder="Type the subject you wish to address"
            value={formData.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            required
            aria-required="true"
            aria-invalid={!!errors.subject}
            aria-describedby={errors.subject ? 'subject-error' : undefined}
          />
          {errors.subject && (
            <div id="subject-error" className="field-error-msg" role="alert">
              <AlertCircle size={13} />
              <span>{errors.subject}</span>
            </div>
          )}
        </div>

        {/* ROW 4: Complaint Description */}
        <div className="form-field">
          <label htmlFor="description" className="form-label">
            Complaint Description <span className="required-asterisk">*</span>
          </label>
          <p className="form-helper-text">
            Provide as much details about your complaint
          </p>
          <textarea
            id="description"
            name="description"
            className={`form-textarea ${errors.description ? 'has-error' : ''}`}
            placeholder="Type your message"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            required
            aria-required="true"
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? 'description-error' : undefined}
          />
          {errors.description && (
            <div id="description-error" className="field-error-msg" role="alert">
              <AlertCircle size={13} />
              <span>{errors.description}</span>
            </div>
          )}
        </div>

        {/* ROW 5: Attachment Upload */}
        <FileUpload
          file={attachment}
          onFileSelect={(f) => setAttachment(f)}
          onFileRemove={() => setAttachment(null)}
        />

        {/* Submit Button */}
        <button
          type="submit"
          className="btn-submit-complaint"
          disabled={isSubmitting}
          aria-label="Submit Complaint"
        >
          {isSubmitting ? (
            <>
              <div className="spinner" aria-hidden="true" />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <span>Submit Complaint</span>
              <Send size={16} strokeWidth={2.2} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
