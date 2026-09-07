'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CountryCode {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+233', name: 'Ghana', flag: '🇬🇭' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+1', name: 'Canada', flag: '🇨🇦' },
];

interface PhoneInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
  hasError?: boolean;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function PhoneInput({
  id = 'phone',
  value,
  onChange,
  countryCode = '+234',
  onCountryCodeChange,
  hasError = false,
  placeholder = 'Type your phone number',
  required = true,
  disabled = false,
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCountry =
    COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCountry = (c: CountryCode) => {
    if (onCountryCodeChange) {
      onCountryCodeChange(c.code);
    }
    setIsOpen(false);
  };

  return (
    <div
      className={`phone-input-wrapper ${hasError ? 'has-error' : ''} ${
        disabled ? 'is-disabled' : ''
      }`}
      ref={dropdownRef}
    >
      {/* Country Selector Trigger */}
      <button
        type="button"
        className="phone-country-select"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select Country Code"
        disabled={disabled}
      >
        <span className="flag-icon" role="img" aria-label={selectedCountry.name}>
          <svg
            width="20"
            height="14"
            viewBox="0 0 20 14"
            fill="none"
            style={{ borderRadius: '2px', display: 'block' }}
          >
            <rect width="6.66" height="14" fill="#008751" />
            <rect x="6.66" width="6.66" height="14" fill="#FFFFFF" />
            <rect x="13.33" width="6.67" height="14" fill="#008751" />
          </svg>
        </span>
        <span className="country-code-text">{countryCode}</span>
        <ChevronDown size={14} className="dropdown-chevron" />
      </button>

      {/* Country Dropdown List */}
      {isOpen && (
        <ul className="country-dropdown-menu" role="listbox">
          {COUNTRY_CODES.map((c, index) => (
            <li
              key={`${c.code}-${index}`}
              className={`country-option ${c.code === countryCode ? 'selected' : ''}`}
              role="option"
              aria-selected={c.code === countryCode}
              onClick={() => handleSelectCountry(c)}
            >
              <span>
                {c.flag} {c.name}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {c.code}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Phone Number Text Input */}
      <input
        type="tel"
        id={id}
        name="phone"
        className="phone-number-field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-required={required}
        aria-invalid={hasError}
      />
    </div>
  );
}
