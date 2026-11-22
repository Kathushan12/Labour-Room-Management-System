import React from 'react';

// Submit and cancel buttons of an inline form: full width and pinned above the bottom nav on phones.
export const FormActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-slate-100 sm:bg-transparent sm:px-0 sm:pb-0 lg:bottom-0 [&>button]:w-full sm:[&>button]:w-auto">
    {children}
  </div>
);
