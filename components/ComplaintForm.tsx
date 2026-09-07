'use client';

import React, { useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import PhoneInput from '@/components/PhoneInput';
import FileUpload from '@/components/FileUpload';
import ComplaintSuccess from '@/components/ComplaintSuccess';
import { ComplaintSubmissionResponse } from '@/types/complaint';

interface FormDataState {
  fullName: string;
  email: string;
  countryCode: string;
  phone: string;
  subject: string;
  description: string;
}

const INITIAL_FORM_STATE: FormDataState = {
  fullName: '',
  email: '',
  countryCode: '+234',
  phone: '',
  subject: '',
  description: '',
};

export default function ComplaintForm() {
  const [formData, setFormData] = useState<FormDataState>(INITIAL_FORM_STATE);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generatedRefNumber, setGeneratedRefNumber] = useState<string | null>(null);

  // Field change handler
  const handleChange = (field: keyof FormDataState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (submitError) {
      setSubmitError(null);
    }
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Client-side validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

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
      const cleanPhone = formData.phone.replace(/[\s\-\+\(\)]/g, '');
      if (!/^\d{7,15}$/.test(cleanPhone)) {
        newErrors.phone = 'Please enter a valid phone number (7 to 15 digits)';
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

  // Reset form and return to form view
  const handleReset = () => {
    setFormData(INITIAL_FORM_STATE);
    setAttachment(null);
    setErrors({});
    setSubmitError(null);
    setGeneratedRefNumber(null);
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!validateForm()) {
      const firstErrorKey = Object.keys(errors)[0];
      const element = document.getElementById(firstErrorKey);
      if (element) {
        element.focus();
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const fullPhoneNumber = `${formData.countryCode} ${formData.phone.trim()}`;

      // Use FormData for seamless multi-part file and field transmission
      const submitData = new FormData();
      submitData.append('fullName', formData.fullName.trim());
      if (formData.email.trim()) {
        submitData.append('email', formData.email.trim());
      }
      submitData.append('phone', fullPhoneNumber);
      submitData.append('subject', formData.subject.trim());
      submitData.append('description', formData.description.trim());

      if (attachment) {
        submitData.append('attachment', attachment);
      }

      const response = await fetch('/api/complaints', {
        method: 'POST',
        body: submitData,
      });

      const result: ComplaintSubmissionResponse = await response.json();

      if (!response.ok || !result.success || !result.referenceNumber) {
        const errorMsg =
          result.message || 'We were unable to submit your complaint at this time. Please try again.';
        setSubmitError(errorMsg);
        if (result.errors) {
          setErrors(result.errors);
        }
        return;
      }

      // Success: display confirmation state with real reference number
      setGeneratedRefNumber(result.referenceNumber);
    } catch (err) {
      console.error('Submission fetch failure:', err);
      setSubmitError('We were unable to submit your complaint at this time. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render success view if reference number was generated
  if (generatedRefNumber) {
    return <ComplaintSuccess referenceNumber={generatedRefNumber} onReset={handleReset} />;
  }

  return (
    <div className="form-card" aria-labelledby="form-title">
      <h2 id="form-title" className="form-title">
        Complaint Form
      </h2>

      {/* Global submission error banner */}
      {submitError && (
        <div className="submission-error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{submitError}</span>
        </div>
      )}

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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
            onChange={(val: string) => handleChange('phone', val)}
            countryCode={formData.countryCode}
            onCountryCodeChange={(code: string) => handleChange('countryCode', code)}
            hasError={!!errors.phone}
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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
          onFileSelect={(f: File) => {
            setAttachment(f);
            if (errors.attachment) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.attachment;
                return next;
              });
            }
          }}
          onFileRemove={() => setAttachment(null)}
          disabled={isSubmitting}
        />
        {errors.attachment && (
          <div className="field-error-msg" style={{ marginTop: '8px' }} role="alert">
            <AlertCircle size={14} />
            <span>{errors.attachment}</span>
          </div>
        )}

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
              <span>{attachment ? 'Submitting & Uploading Attachment...' : 'Submitting Complaint...'}</span>
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
