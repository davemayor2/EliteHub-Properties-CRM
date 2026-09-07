'use client';

import React, { useState, useEffect } from 'react';

const WORDS = ['Help', 'Assist', 'Aid', 'Guide', 'Support'];

/**
 * HeroHeading Component with Typewriter Animation & Design-Tool Selection Box
 *
 * - Typing animation: Types character-by-character, pauses on the completed word,
 *   deletes character-by-character, and cycles through ['Help', 'Assist', 'Aid', 'Guide', 'Support'].
 * - Green selection bounding box around the animated word with 4 corner anchor handles.
 * - Period (.) positioned strictly outside the bounding box.
 */
export default function HeroHeading({ className = '' }) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const targetWord = WORDS[currentWordIndex];

    let timer;

    if (!isDeleting) {
      // Typing phase: add one letter
      if (displayText.length < targetWord.length) {
        timer = setTimeout(() => {
          setDisplayText(targetWord.slice(0, displayText.length + 1));
        }, 120); // typing speed
      } else {
        // Word is complete, pause before deleting
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2200);
      }
    } else {
      // Deleting phase: remove one letter
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(targetWord.slice(0, displayText.length - 1));
        }, 70); // deleting speed
      } else {
        // Finished deleting, move to next word
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % WORDS.length);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentWordIndex]);

  return (
    <h1
      className={`hero-title font-['Inter',sans-serif] text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-neutral-900 text-center leading-tight ${className}`}
    >
      We&apos;re Here to{' '}
      {/* Design Tool Transform Selection Bounding Box */}
      <span className="hero-selection-box relative inline-flex items-center border-[1.5px] border-[#22c55e] px-1.5 py-0 mx-1 align-baseline select-none">
        {/* Corner Handle: Top-Left */}
        <span
          aria-hidden="true"
          className="selection-handle handle-tl absolute -top-[4px] -left-[4px] w-[6px] h-[6px] bg-white border-[1.5px] border-[#22c55e] z-10 pointer-events-none"
        />

        {/* Corner Handle: Top-Right */}
        <span
          aria-hidden="true"
          className="selection-handle handle-tr absolute -top-[4px] -right-[4px] w-[6px] h-[6px] bg-white border-[1.5px] border-[#22c55e] z-10 pointer-events-none"
        />

        {/* Corner Handle: Bottom-Left */}
        <span
          aria-hidden="true"
          className="selection-handle handle-bl absolute -bottom-[4px] -left-[4px] w-[6px] h-[6px] bg-white border-[1.5px] border-[#22c55e] z-10 pointer-events-none"
        />

        {/* Corner Handle: Bottom-Right */}
        <span
          aria-hidden="true"
          className="selection-handle handle-br absolute -bottom-[4px] -right-[4px] w-[6px] h-[6px] bg-white border-[1.5px] border-[#22c55e] z-10 pointer-events-none"
        />

        {/* Dynamic Typewriter Word */}
        <span className="typed-text-word inline-block min-w-[20px] text-neutral-900 font-bold">
          {displayText || '\u00A0'}
        </span>
        
        {/* Blinking Cursor */}
        <span className="typing-cursor font-light text-[#22c55e]" aria-hidden="true">|</span>
      </span>
      {/* Trailing period outside the bounding box */}
      <span className="text-neutral-900">.</span>
    </h1>
  );
}
