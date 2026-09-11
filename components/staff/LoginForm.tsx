'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/staff/dashboard';

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your staff email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      // Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        // Map Supabase error messages to clear, user-friendly text
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          setErrorMessage('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          setErrorMessage('Your email address has not been confirmed. Please contact your system administrator.');
        } else {
          setErrorMessage(error.message || 'Unable to sign in. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        // Touch profile updated_at to register active login state
        try {
          await supabase
            .from('profiles')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', data.user.id);
        } catch {
          // Non-blocking update
        }

        // Full window navigation ensures the server StaffLayout initializes fresh with the new session and displays the sidebar/navbar
        const target = redirectUrl.startsWith('/staff') ? redirectUrl : '/staff/dashboard';
        window.location.href = target;
      }
    } catch (err) {
      console.error('Staff login error:', err);
      setErrorMessage('A network error occurred. Please check your connection and try again.');
      setIsLoading(false);
    }
  };

  return (
    <form className="staff-login-form" onSubmit={handleLogin} noValidate>
      {/* Error Banner */}
      {errorMessage && (
        <div className="submission-error-banner staff-error-banner" role="alert">
          <AlertCircle size={18} className="error-icon" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Email Field */}
      <div className="form-field">
        <label htmlFor="staff-email" className="form-label">
          Staff Email Address <span className="required-asterisk">*</span>
        </label>
        <div className="staff-input-container">
          <Mail size={18} className="staff-input-icon" />
          <input
            type="email"
            id="staff-email"
            name="email"
            className="form-input staff-input"
            placeholder="e.g. name@elitehub.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            disabled={isLoading}
            required
            autoComplete="email"
            autoFocus
            aria-required="true"
          />
        </div>
      </div>

      {/* Password Field with Show/Hide Toggle */}
      <div className="form-field">
        <label htmlFor="staff-password" className="form-label">
          Password <span className="required-asterisk">*</span>
        </label>
        <div className="staff-input-container">
          <Lock size={18} className="staff-input-icon" />
          <input
            type={showPassword ? 'text' : 'password'}
            id="staff-password"
            name="password"
            className="form-input staff-input"
            placeholder="Enter your staff password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            disabled={isLoading}
            required
            autoComplete="current-password"
            aria-required="true"
          />
          <button
            type="button"
            className="btn-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={0}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="btn-submit-complaint btn-staff-login"
        disabled={isLoading}
        aria-label="Sign in to Staff Portal"
      >
        {isLoading ? (
          <>
            <div className="spinner" aria-hidden="true" />
            <span>Signing In...</span>
          </>
        ) : (
          <>
            <span>Sign In to Staff Portal</span>
            <ArrowRight size={16} strokeWidth={2.2} />
          </>
        )}
      </button>
    </form>
  );
}
