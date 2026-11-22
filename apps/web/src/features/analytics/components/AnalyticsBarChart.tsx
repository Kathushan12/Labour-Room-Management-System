import React, { useState } from 'react';

export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
  sublabel?: string;
}

interface AnalyticsBarChartProps {
  data: BarChartItem[];
  title?: string;
  orientation?: 'horizontal' | 'vertical';
  height?: number;
  unit?: string;
  emptyText?: string;
  className?: string;
  testId?: string;
}

const DEFAULT_COLORS = [
  '#0d9488', // teal-600
  '#1e3a8a', // blue-900 / navy
  '#0284c7', // sky-600
  '#475569', // slate-600
  '#6366f1', // indigo-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#8b5cf6', // purple-500
];

export const AnalyticsBarChart: React.FC<AnalyticsBarChartProps> = ({
  data,
  title,
  orientation = 'horizontal',
  height = 240,
  unit = '',
  emptyText = 'No data available for selected period',
  className = '',
  testId = 'analytics-bar-chart',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (orientation === 'horizontal') {
    return (
      <div
        className={`w-full space-y-3 ${className}`}
        data-testid={testId}
        role="region"
        aria-label={title || 'Bar Chart'}
      >
        {title && (
          <h4 className="text-xs font-semibold text-slate-700 tracking-wide uppercase">{title}</h4>
        )}
        <div className="space-y-2.5">
          {data.map((item, index) => {
            const pct = Math.round((item.value / maxValue) * 100);
            const barColor = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={item.label}
                className="group relative"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 truncate max-w-[200px] sm:max-w-[300px]">
                    {item.label}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">
                      {item.value.toLocaleString()} {unit}
                    </span>
                    {item.sublabel && (
                      <span className="text-[11px] text-slate-500">({item.sublabel})</span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: barColor,
                      opacity: isHovered ? 0.9 : 1,
                    }}
                    role="progressbar"
                    aria-valuenow={item.value}
                    aria-valuemin={0}
                    aria-valuemax={maxValue}
                    aria-label={`${item.label}: ${item.value} ${unit}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical orientation
  const barWidth = 32;
  const gap = 16;
  const chartWidth = Math.max(data.length * (barWidth + gap) + 40, 280);
  const chartHeight = height - 40;

  return (
    <div
      className={`w-full overflow-x-auto ${className}`}
      data-testid={testId}
      role="region"
      aria-label={title || 'Vertical Bar Chart'}
    >
      {title && (
        <h4 className="text-xs font-semibold text-slate-700 tracking-wide uppercase mb-3">
          {title}
        </h4>
      )}
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full h-auto min-w-[280px]"
        style={{ maxHeight: height }}
        role="img"
        aria-label={title || 'Vertical Bar Chart'}
      >
        {/* Y Axis Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = chartHeight - ratio * (chartHeight - 30) + 10;
          return (
            <g key={ratio}>
              <line
                x1="30"
                y1={y}
                x2={chartWidth - 10}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text x="24" y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
                {Math.round(ratio * maxValue)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = Math.max((item.value / maxValue) * (chartHeight - 30), 4);
          const x = 40 + index * (barWidth + gap);
          const y = chartHeight + 10 - barHeight;
          const barColor = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
          const isHovered = hoveredIndex === index;

          return (
            <g
              key={item.label}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={barColor}
                opacity={isHovered ? 0.85 : 1}
                className="transition-all duration-200"
              />
              {/* Value label on bar or above */}
              <text
                x={x + barWidth / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize="10"
                fontWeight="bold"
                fill="#1e293b"
              >
                {item.value}
              </text>
              {/* Category label below */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 25}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
                className="select-none"
              >
                {item.label.length > 8 ? `${item.label.slice(0, 7)}…` : item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
