import * as React from 'react';
import { AlertCircle } from 'lucide-react';

interface FieldErrorProps {
  id: string;
  message?: string | null;
}

// SRS UI-3: the message sits directly under its field and says how to fix it.
export const FieldError: React.FC<FieldErrorProps> = ({ id, message }) => {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1 text-xs font-medium text-red-700">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
};

/** Props that tie an input to its FieldError. */
export function errorProps(id: string, message?: string | null) {
  return message
    ? ({ 'aria-invalid': true, 'aria-describedby': id + '-error' } as const)
    : ({} as Record<string, never>);
}
