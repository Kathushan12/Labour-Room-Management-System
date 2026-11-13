import React from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button.js';
import { Card, CardContent } from '../ui/card.js';
import { Skeleton } from '../ui/skeleton.js';

export const EmptyState: React.FC<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}> = ({ title, description, icon, actionLabel, onAction, className }) => {
  return (
    <Card className={`border-dashed border-slate-200 bg-slate-50/50 ${className || ''}`}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-slate-100 p-3 text-slate-400 mb-3">
          {icon || <Inbox className="h-6 w-6" />}
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">{description}</p>
        {actionLabel && onAction && (
          <Button variant="outline" size="sm" onClick={onAction} className="mt-4 text-xs">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}> = ({ title = 'Failed to load data', message, onRetry, className }) => {
  return (
    <Card className={`border-red-200 bg-red-50/30 ${className || ''}`}>
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-full bg-red-100 p-2.5 text-red-600 mb-2">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold text-red-800">{title}</h3>
        <p className="text-xs text-slate-600 max-w-md mt-1">{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3 text-xs flex items-center space-x-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            <span>Retry Operation</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export const LoadingSkeleton: React.FC<{
  count?: number;
  className?: string;
}> = ({ count = 3, className }) => {
  return (
    <div className={`space-y-3 ${className || ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm space-y-2"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};
