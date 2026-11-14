import React, { useState } from 'react';

export interface DonutChartItem {
  label: string;
  value: number;
  color?: string;
}

interface AnalyticsDonutChartProps {
  data: DonutChartItem[];
  title?: string;
  totalLabel?: string;
  centerValue?: string | number;
  size?: number;
  unit?: string;
  emptyText?: string;
  className?: string;
  testId?: string;
}

const DEFAULT_COLORS = [
  '#0d9488', // teal-600
  '#1e3a8a', // navy
  '#0284c7', // sky-600
  '#f59e0b', // amber-500
  '#6366f1', // indigo-500
  '#10b981', // emerald-500
  '#ec4899', // pink-500
  '#64748b', // slate-500
];

export const AnalyticsDonutChart: React.FC<AnalyticsDonutChartProps> = ({
  data,
  title,
  totalLabel = 'Total',
  centerValue,
  size = 200,
  unit = '',
  emptyText = 'No data available',
  className = '',
  testId = 'analytics-donut-chart',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-slate-400 italic p-6 rounded-lg border border-dashed border-slate-200 ${className}`}
        style={{ minHeight: size }}
        data-testid={testId}
      >
        {emptyText}
      </div>
    );
  }

  // SVG Donut calculation
  const radius = 68;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div
      className={`space-y-4 ${className}`}
      data-testid={testId}
      role="region"
      aria-label={title || 'Donut Chart'}
    >
      {title && (
        <h4 className="text-xs font-semibold text-slate-700 tracking-wide uppercase">{title}</h4>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        {/* SVG Donut */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg
            viewBox="0 0 180 180"
            className="w-full h-full -rotate-90 transform"
            role="img"
            aria-label={title || 'Donut Chart'}
          >
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />
            {data.map((item, index) => {
              if (item.value === 0) return null;
              const percent = item.value / total;
              const strokeDasharray = `${percent * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPercent * circumference;
              accumulatedPercent += percent;

              const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
              const isHovered = hoveredIndex === index;

              return (
                <circle
                  key={item.label}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
              {centerValue !== undefined ? centerValue : total.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              {totalLabel}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full sm:w-auto flex-1 space-y-2">
          {data.map((item, index) => {
            const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
            const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={item.label}
                className={`flex items-center justify-between text-xs p-1.5 rounded-md transition-colors cursor-pointer ${
                  isHovered ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center space-x-2 min-w-0 pr-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium text-slate-700 truncate">{item.label}</span>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="font-bold text-slate-900 font-sans">
                    {item.value.toLocaleString()} {unit}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium w-9 text-right font-sans">
                    {percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
