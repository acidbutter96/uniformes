'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/app/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-surface shadow-soft hover:bg-primary/95 disabled:hover:bg-primary focus-visible:ring-primary',
  secondary:
    'bg-surface text-text ring-1 ring-border hover:bg-background focus-visible:ring-primary',
  ghost: 'bg-transparent text-text hover:bg-primary/10 focus-visible:ring-primary',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-sm py-xs text-caption',
  md: 'px-md py-sm text-body',
  lg: 'px-lg py-md text-h3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', fullWidth = false, className, type = 'button', ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-xs rounded-card font-semibold transition-[background-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
