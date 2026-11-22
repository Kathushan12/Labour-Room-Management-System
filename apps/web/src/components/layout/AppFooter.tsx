import React from 'react';

export const AppFooter: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white py-3 px-4 sm:px-6 text-center text-xs text-slate-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-1 max-w-7xl mx-auto">
        <p className="text-[11px]">
          Labour Room Management System &bull; Colombo South Teaching Hospital, Kalubowila
        </p>
      </div>
    </footer>
  );
};
