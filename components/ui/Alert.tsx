import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/app/lib/utils';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  heading?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

const toneClasses: Record<AlertTone, string> = {
  info: 'border-primary/40 bg-primary/10 text-primary',
  success: 'border-success/40 bg-success/10 text-success',
  warning: 'border-primary/45 bg-primary/15 text-primary',
  danger: 'border-primary/55 bg-primary/20 text-primary',
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      tone = 'info',
      icon,
      heading,
      description,
      disabled = false,
      tabIndex,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        role="alert"
        tabIndex={tabIndex ?? 0}
        className={cn(
          'flex w-full items-start gap-sm rounded-card border px-md py-sm text-body transition hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          toneClasses[tone],
          disabled && 'pointer-events-none opacity-60',
          className,
        )}
        {...props}
      >
        {icon && <span className="mt-[2px] text-xl" aria-hidden>{icon}</span>}
        <div className="flex w-full flex-col gap-xs">
          {heading && <h3 className="text-h3 font-heading leading-snug text-inherit">{heading}</h3>}
          {description && (
            <p className="text-body text-inherit text-opacity-90">{description}</p>
          )}
          {!heading && !description && children}
        </div>
      </div>
    );
  },
);

Alert.displayName = 'Alert';
