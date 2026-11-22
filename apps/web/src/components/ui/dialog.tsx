import * as React from 'react';
import { cn } from '../../lib/utils.js';
import { X } from 'lucide-react';

interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | null>(null);

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>;
};

export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  const context = React.useContext(DialogContext);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const isOpen = !!context?.open;

  // Move focus into the dialog, keep Tab inside it, and give focus back to the opener on close.
  React.useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);
    const first = focusables().find((el) => el.getAttribute('aria-label') !== 'Close dialog');
    (first ?? panel)?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, [isOpen]);

  if (!context || !context.open) return null;

  // Callers size the dialog for desktop (max-w-*, max-h-*); on phones it is always a full-screen sheet.
  const desktopClassName = className
    ?.split(/\s+/)
    .map((c) => (/^(max-[wh]-|rounded-(xl|lg|md)$)/.test(c) ? 'sm:' + c : c))
    .join(' ');

  return (
    <div
      className="fixed inset-0 z-50 !m-0 flex items-stretch justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => context.onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Modal Dialog Content */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative z-50 flex h-full w-full outline-none min-w-0 flex-col overflow-y-auto overflow-x-hidden bg-white p-4 pt-safe pb-safe shadow-xl animate-in fade-in-0 [&>form]:flex [&>form]:flex-1 [&>form]:flex-col sm:block sm:[&>form]:block sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-xl sm:border sm:border-border sm:p-6 sm:zoom-in-95',
          desktopClassName,
        )}
        {...props}
      >
        <button
          onClick={() => context.onOpenChange(false)}
          className="absolute right-1 top-1 sm:right-4 sm:top-4 h-11 w-11 sm:h-auto sm:w-auto flex items-center justify-center rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
};

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn('flex flex-col space-y-1.5 pr-10 text-left mb-4', className)}
    {...props}
  />
);

export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  ...props
}) => (
  <h2
    className={cn('text-lg font-semibold leading-none tracking-tight text-slate-900', className)}
    {...props}
  />
);

export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  ...props
}) => <p className={cn('text-sm text-muted-foreground', className)} {...props} />;

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn('sticky bottom-0 z-10 -mx-4 mt-auto flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 pb-safe sm:static sm:mx-0 sm:mt-6 sm:flex-row sm:justify-end sm:border-0 sm:p-0 [&>button]:w-full sm:[&>button]:w-auto', className)}
    {...props}
  />
);
