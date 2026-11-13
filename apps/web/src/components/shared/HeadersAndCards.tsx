import React from 'react';
import { Breadcrumb, BreadcrumbItem } from '../ui/breadcrumb.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card.js';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  action,
  badge,
}) => {
  const actionContent = actions || action;
  return (
    <div className="border-b border-slate-200 bg-white px-4 sm:px-6 py-4">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-2">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">{description}</p>
          )}
        </div>
        {actionContent && <div className="flex items-center space-x-2">{actionContent}</div>}
      </div>
    </div>
  );
};

export const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  className?: string;
}> = ({ title, value, subtitle, icon, trend, className }) => {
  return (
    <Card className={`shadow-sm border-slate-200 ${className || ''}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          {icon && <div className="text-slate-400 p-1.5 rounded-md bg-slate-50">{icon}</div>}
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
          {trend && <span className="text-xs font-medium text-teal-700">{trend}</span>}
        </div>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
};

export const SectionCard: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, description, action, children, className }) => {
  return (
    <Card className={`shadow-sm border-slate-200 ${className || ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          )}
        </div>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
};
