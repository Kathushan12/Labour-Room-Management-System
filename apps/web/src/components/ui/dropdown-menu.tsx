import * as React from 'react';
import { cn } from '../../lib/utils.js';

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  children,
  align = 'right',
}) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 min-w-[10rem] overflow-hidden rounded-md border bg-white p-1 text-slate-800 shadow-md animate-in fade-in-0 zoom-in-95',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const DropdownMenuItem: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { inset?: boolean }
> = ({ className, inset, children, ...props }) => {
  return (
    <button
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs font-medium outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 disabled:pointer-events-none disabled:opacity-50 text-left',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
