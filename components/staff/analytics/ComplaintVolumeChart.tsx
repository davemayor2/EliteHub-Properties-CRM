'use client';

import React, { useState } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { TrendDataPoint } from '@/lib/analytics/types';

interface ComplaintVolumeChartProps {
  data: TrendDataPoint[];
  selectedRangeLabel: string;
}

export default function ComplaintVolumeChart({
  data,
  selectedRangeLabel,
}: ComplaintVolumeChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    x: number;
    y: number;
    point: TrendDataPoint;
  } | null>(null);

  const totalVolume = data.reduce((sum, item) => sum + item.count, 0);

  // SVG dimensions
  const width = 800;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.count), 4);
  // Round maxVal up to clean interval
  const yMax = Math.ceil(maxVal * 1.2);

  // Coordinates calculation
  const points = data.map((d, i) => {
    const x =
      data.length > 1
        ? padding.left + (i / (data.length - 1)) * chartWidth
        : padding.left + chartWidth / 2;
    const y = padding.top + chartHeight - (d.count / yMax) * chartHeight;
    return { x, y, point: d, index: i };
  });

  // SVG Area path generator
  const createPathD = () => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      return `M ${padding.left} ${padding.top + chartHeight} L ${points[0].x} ${points[0].y} L ${padding.left + chartWidth} ${padding.top + chartHeight}`;
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const lineD = createPathD();
  const areaD =
    points.length > 0
      ? `${lineD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
      : '';

  // Y-axis grid ticks (3 ticks: 0, half, max)
  const yTicks = [0, Math.round(yMax / 2), yMax];

  return (
    <div className="staff-section-card chart-container-card" role="region" aria-label="Complaint Volume Trend">
      {/* Chart Header */}
      <div className="section-card-header flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="header-icon-pill icon-pill-emerald">
            <TrendingUp size={18} />
          </div>
          <div>
            <h2 className="section-card-title">Complaint Volume</h2>
            <p className="section-card-subtitle">
              Complaints received over time ({selectedRangeLabel.toLowerCase()}).
            </p>
          </div>
        </div>

        <div className="chart-summary-badge">
          <span className="summary-badge-label">Period Total:</span>
          <span className="summary-badge-val">{totalVolume.toLocaleString()}</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="chart-canvas-wrapper">
        {data.length === 0 ? (
          <div className="chart-empty-state">
            <BarChart3 size={32} className="text-muted opacity-40 mb-2" />
            <p className="empty-chart-title">No complaint data available yet.</p>
            <p className="empty-chart-desc">
              New submissions will automatically populate this trend graph.
            </p>
          </div>
        ) : (
          <div className="svg-responsive-container">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="volume-trend-svg"
              aria-label={`Complaint volume trend showing ${totalVolume} total complaints.`}
            >
              <defs>
                <linearGradient id="volumeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#145E3D" stopOpacity="0.28" />
                  <stop offset="85%" stopColor="#145E3D" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#145E3D" stopOpacity="0" />
                </linearGradient>

                <filter id="pointGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#145E3D" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Horizontal Gridlines */}
              {yTicks.map((tick) => {
                const y = padding.top + chartHeight - (tick / yMax) * chartHeight;
                return (
                  <g key={tick} className="chart-gridline-group">
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="rgba(226, 232, 240, 0.8)"
                      strokeDasharray="4,4"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="chart-axis-label"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill */}
              {areaD && (
                <path d={areaD} fill="url(#volumeAreaGradient)" />
              )}

              {/* Trend Curve Line */}
              {lineD && (
                <path
                  d={lineD}
                  fill="none"
                  stroke="#145E3D"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points and Interaction Circles */}
              {points.map((p) => {
                const isHovered = hoveredPoint?.index === p.index;
                return (
                  <g
                    key={p.index}
                    className="chart-data-node"
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Invisible larger hit target */}
                    <circle cx={p.x} cy={p.y} r="14" fill="transparent" />

                    {/* Visible circle */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 5.5 : 3.5}
                      fill={isHovered ? '#F9A430' : '#145E3D'}
                      stroke="#ffffff"
                      strokeWidth="2"
                      filter={isHovered ? 'url(#pointGlow)' : undefined}
                      className="transition-all duration-150"
                    />

                    {/* X-axis label (show selected labels to prevent crowding) */}
                    {data.length <= 14 || p.index % Math.ceil(data.length / 8) === 0 ? (
                      <text
                        x={p.x}
                        y={height - 12}
                        textAnchor="middle"
                        className="chart-axis-label chart-x-label"
                      >
                        {p.point.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div
                className="chart-hover-tooltip"
                style={{
                  left: `${(hoveredPoint.x / width) * 100}%`,
                  top: `${(hoveredPoint.y / height) * 100}%`,
                }}
              >
                <div className="tooltip-date">{hoveredPoint.point.label}</div>
                <div className="tooltip-value">
                  <span className="tooltip-count">{hoveredPoint.point.count}</span>
                  <span className="tooltip-unit">
                    {hoveredPoint.point.count === 1 ? 'complaint' : 'complaints'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
