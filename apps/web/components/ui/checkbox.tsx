'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from 'cn';

export interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        ref={ref}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onCheckedChange?.(!checked);
        }}
        className={cn(
          'peer h-5 w-5 shrink-0 rounded-md border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center',
          checked
            ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-primary-400',
          className
        )}
        {...props}
      >
        {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
      </button>
    );
  }
);
Checkbox.displayName = 'Checkbox';
