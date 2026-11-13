import * as React from 'react';
import { cn } from '../../lib/utils.js';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-xs text-slate-500', className)}
    >
      <ol className="flex items-center space-x-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center space-x-1.5">
              {item.href && !isLast ? (
                <a href={item.href} className="hover:text-slate-800 transition-colors">
                  {item.label}
                </a>
              ) : (
                <span className={cn(isLast ? 'font-semibold text-slate-900' : '')}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
