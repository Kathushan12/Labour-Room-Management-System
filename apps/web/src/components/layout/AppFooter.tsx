import React from 'react';

export const AppFooter: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white py-3 px-4 sm:px-6 text-center text-xs text-slate-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-1 max-w-7xl mx-auto">
        <p className="text-[11px]">
          Labour Room Management System &bull; CO2307 Software Engineering &bull; Group 07 (2026)
        </p>
        <p className="text-[11px] text-slate-400">
          Academic Prototype (Not for Real Clinical Deployment) &bull; CSTH Kalubowila Model
        </p>
      </div>
    </footer>
  );
};
