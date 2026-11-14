import React from 'react';
import { Card, CardContent } from '../../../components/ui/card.js';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface AnalyticsKpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  delta?: {
    value: number; // e.g. +12.5 or -5.0
    label?: string; // e.g. "vs previous period"
    isPositiveGood?: boolean; // default true (false for e.g. latency or stillbirths)
  };
  target?: string;
  icon?: React.ReactNode;
  iconBgColor?: string; // Tailwind class, e.g. "bg-teal-50 text-teal-700"
  testId?: string;
  className?: string;
}

export const AnalyticsKpiCard: React.FC<AnalyticsKpiCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  delta,
  target,
  icon,
  iconBgColor = 'bg-slate-50 text-slate-700',
  testId = 'analytics-kpi-card',
  className = '',
}) => {
  const renderDelta = () => {
    if (!delta) return null;
    const isPositive = delta.value > 0;
    const isZero = delta.value === 0;
    const isGood = delta.isPositiveGood !== false ? isPositive : !isPositive;

    const textColor = isZero
      ? 'text-slate-500 bg-slate-100'
      : isGood
        ? 'text-emerald-700 bg-emerald-50'
        : 'text-amber-700 bg-amber-50';

    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${textColor}`}
        title={delta.label || 'vs comparison period'}
      >
        {isZero ? (
          <Minus className="w-3 h-3 mr-0.5" />
        ) : isPositive ? (
          <TrendingUp className="w-3 h-3 mr-0.5" />
        ) : (
          <TrendingDown className="w-3 h-3 mr-0.5" />
        )}
        {isPositive ? `+${delta.value}%` : `${delta.value}%`}
        {delta.label && <span className="ml-1 font-normal opacity-80">{delta.label}</span>}
      </span>
    );
  };

  return (
    <Card
      className={`shadow-xs border-slate-200 transition-all hover:shadow-sm ${className}`}
      data-testid={testId}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          {icon && <div className={`p-2 rounded-lg ${iconBgColor} shrink-0`}>{icon}</div>}
        </div>

        <div className="mt-2.5 flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
            {value}
          </span>
          {unit && <span className="text-xs font-medium text-slate-500">{unit}</span>}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {renderDelta()}
          {target && (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
              {target}
            </span>
          )}
        </div>

        {subtitle && <p className="text-xs text-slate-500 mt-2">{subtitle}</p>}
      </CardContent>
    </Card>
  );
};
