import * as React from 'react';
import { cn } from '../../lib/utils.js';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const CONTROL = 'input, select, textarea';

// A label without htmlFor is tied to the control that follows it (its next sibling, or the first
// control inside that sibling), so screen readers and taps on the label reach the field.
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, htmlFor, ...props }, ref) => {
    const innerRef = React.useRef<HTMLLabelElement | null>(null);
    const generatedId = React.useId();

    React.useEffect(() => {
      const label = innerRef.current;
      if (!label || htmlFor) return;
      const next = label.nextElementSibling;
      if (!next) return;
      const control = next.matches(CONTROL) ? next : next.querySelector(CONTROL);
      if (!control) return;
      if (!control.id) control.id = generatedId;
      label.htmlFor = control.id;
    });

    return (
      <label
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        htmlFor={htmlFor}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700',
          className,
        )}
        {...props}
      />
    );
  },
);
Label.displayName = 'Label';
