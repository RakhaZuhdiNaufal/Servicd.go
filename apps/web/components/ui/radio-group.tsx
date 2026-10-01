'use client';

import * as React from 'react';
import { cn } from 'cn';

interface RadioGroupContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({});

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

export function RadioGroup({
  value,
  onValueChange,
  disabled,
  className,
  children,
  ...props
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, disabled }}>
      <div role="radiogroup" className={cn('grid gap-2', className)} {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, disabled: itemDisabled, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    const checked = context.value === value;
    const disabled = itemDisabled || context.disabled;

    return (
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        ref={ref}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) {
            context.onValueChange?.(value);
          }
        }}
        className={cn(
          'aspect-square h-5 w-5 rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center',
          checked
            ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-primary-400',
          className
        )}
        {...props}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-white" />}
      </button>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';
