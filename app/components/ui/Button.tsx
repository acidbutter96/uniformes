import { ButtonHTMLAttributes, forwardRef, type Ref } from 'react';
import { cn } from '@/app/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-card hover:bg-primary/90 focus-visible:outline-primary',
  secondary: 'bg-surface text-text ring-1 ring-inset ring-border hover:bg-surface/90',
  ghost: 'bg-transparent text-primary hover:bg-primary/10',
};

interface ButtonClassOptions {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  className?: string;
}

export function buttonClasses({
  variant = 'primary',
  fullWidth = false,
  className,
}: ButtonClassOptions = {}) {
  return cn(
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
    variantClasses[variant],
    fullWidth && 'w-full',
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      fullWidth = false,
      className,
      children,
      type = 'button',
      ...props
    }: ButtonProps,
    ref: Ref<HTMLButtonElement>,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses({ variant, fullWidth, className })}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
