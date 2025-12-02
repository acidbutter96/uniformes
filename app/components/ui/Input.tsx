'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/app/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'w-full rounded-card border border-border bg-surface px-md py-sm text-body text-text shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background placeholder:text-text-muted hover:border-primary/40 disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-muted disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-danger',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
