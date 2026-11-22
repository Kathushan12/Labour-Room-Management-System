import React from 'react';
import { BedDouble, FileText } from 'lucide-react';

interface PatientHeaderProps {
  refId: string;
  bedNumber?: string | null;
  children?: React.ReactNode;
  className?: string;
}

// SRS 3.1: Admission Ref ID and bed are shown together at the top of every clinical screen.
export const PatientHeader: React.FC<PatientHeaderProps> = ({
  refId,
  bedNumber,
  children,
  className,
}) => (
  <div
    className={`sticky top-16 z-20 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 bg-white/95 px-4 py-2 shadow-xs backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 ${className ?? ''}`}
    role="group"
    aria-label="Patient admission and bed"
  >
    <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums text-slate-900">
      <FileText className="h-4 w-4 text-slate-500" aria-hidden="true" />
      {refId}
    </span>
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-900">
      <BedDouble className="h-4 w-4 text-teal-700" aria-hidden="true" />
      {bedNumber ? (
        <>
          <span className="sr-only">Bed </span>
          {bedNumber}
        </>
      ) : (
        'No bed allocated'
      )}
    </span>
    {children && <span className="flex flex-wrap items-center gap-2">{children}</span>}
  </div>
);
