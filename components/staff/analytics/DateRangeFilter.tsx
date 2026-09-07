'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Calendar, Check } from 'lucide-react';
import { DateRangeOption } from '@/lib/analytics/types';

interface DateRangeFilterProps {
  currentRange: DateRangeOption;
}

const OPTIONS: { id: DateRangeOption; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
];

export default function DateRangeFilter({ currentRange }: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSelect = (range: DateRangeOption) => {
    const params = new URLSearchParams(searchParams.toString());
    if (range === 'all') {
      params.delete('range');
    } else {
      params.set('range', range);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    router.push(`${pathname}${query}`, { scroll: false });
  };

  return (
    <div className="date-range-filter-wrapper" role="region" aria-label="Date Range Filtering">
      <div className="date-range-icon-label">
        <Calendar size={15} className="text-muted" />
        <span className="filter-label-text">Timeframe:</span>
      </div>

      <div className="date-range-pills" role="radiogroup" aria-label="Select timeframe">
        {OPTIONS.map((opt) => {
          const isActive = currentRange === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => handleSelect(opt.id)}
              className={`date-range-pill ${isActive ? 'active' : ''}`}
            >
              {isActive && <Check size={12} className="pill-check-icon" />}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
