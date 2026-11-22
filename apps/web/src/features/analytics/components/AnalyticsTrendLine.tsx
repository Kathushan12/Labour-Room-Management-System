import React, { useState } from 'react';

export interface TrendDataPoint {
  date: string;
  value: number;
  secondaryValue?: number;
  label?: string;
}

interface AnalyticsTrendLineProps {
  data: TrendDataPoint[];
  title?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  height?: number;
  unit?: string;
  emptyText?: string;
  className?: string;
  testId?: string;
}

export const AnalyticsTrendLine: React.FC<AnalyticsTrendLineProps> = ({
  data,
  title,
  primaryLabel = 'Admissions',
  secondaryLabel,
  primaryColor = '#0d9488', // teal-600
  secondaryColor = '#1e3a8a', // navy
  height = 220,
  unit = '',
  emptyText = 'No time-series data available',
  className = '',
  testId = 'analytics-trend-line',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<TrendDataPoint | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-slate-500 italic p-6 rounded-lg border border-dashed border-slate-200 ${className}`}
        style={{ height }}
        data-testid={testId}
      >
        {emptyText}
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 35, left: 35 };
  const width = Math.max(data.length * 45, 320);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.flatMap((d) => [d.value, d.secondaryValue || 0]), 1);

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return padding.top + chartHeight - (val / maxVal) * chartHeight;
  };

  // Build SVG Path
  const primaryPoints = data.map((d, i) => `${getX(i)},${getY(d.value)}`);
  const primaryPath = `M ${primaryPoints.join(' L ')}`;
  const primaryArea = `${primaryPath} L ${getX(data.length - 1)},${padding.top + chartHeight} L ${getX(0)},${padding.top + chartHeight} Z`;

  const secondaryPoints = secondaryLabel
    ? data.map((d, i) => `${getX(i)},${getY(d.secondaryValue || 0)}`)
    : [];
  const secondaryPath = secondaryPoints.length > 0 ? `M ${secondaryPoints.join(' L ')}` : '';

  return (
    <div
      className={`w-full overflow-x-auto ${className}`}
      data-testid={testId}
      role="region"
      aria-label={title || 'Trend Line'}
    >
      <div className="flex items-center justify-between mb-2">
        {title && (
          <h4 className="text-xs font-semibold text-slate-700 tracking-wide uppercase">{title}</h4>
        )}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
            <span className="text-slate-600 font-medium">{primaryLabel}</span>
          </div>
          {secondaryLabel && (
            <div className="flex items-center space-x-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: secondaryColor }}
              />
              <span className="text-slate-600 font-medium">{secondaryLabel}</span>
            </div>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-w-[320px]"
        style={{ maxHeight: height }}
        role="img"
        aria-label={title || 'Time-series trend'}
      >
        <defs>
          <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Y Axis Grid lines */}
        {[0, 0.33, 0.66, 1].map((ratio) => {
          const y = padding.top + chartHeight - ratio * chartHeight;
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="3 3"
              />
              <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
                {Math.round(ratio * maxVal)}
              </text>
            </g>
          );
        })}

        {/* Primary Area Fill & Line */}
        <path d={primaryArea} fill="url(#primaryGradient)" />
        <path
          d={primaryPath}
          fill="none"
          stroke={primaryColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Secondary Line if present */}
        {secondaryPath && (
          <path
            d={secondaryPath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {data.map((d, i) => {
          const x = getX(i);
          const y = getY(d.value);
          const isHovered = hoveredPoint?.date === d.date;

          return (
            <g key={d.date} className="cursor-pointer">
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 5 : 3.5}
                fill="#ffffff"
                stroke={primaryColor}
                strokeWidth={isHovered ? 2.5 : 2}
                onMouseEnter={() => setHoveredPoint(d)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {/* X Axis Label */}
              <text
                x={x}
                y={padding.top + chartHeight + 18}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
              >
                {d.label || d.date.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip display */}
      {hoveredPoint && (
        <div className="mt-1 text-center text-xs text-slate-600 bg-slate-50 py-1 px-2 rounded border border-slate-200">
          <span className="font-semibold">{hoveredPoint.label || hoveredPoint.date}: </span>
          <span>
            {primaryLabel}: {hoveredPoint.value} {unit}
          </span>
          {secondaryLabel && hoveredPoint.secondaryValue !== undefined && (
            <span className="ml-3">
              {secondaryLabel}: {hoveredPoint.secondaryValue} {unit}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
