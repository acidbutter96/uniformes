import { HTMLAttributes } from 'react';
import { cn } from '@/app/lib/utils';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  success: 'bg-success-50 text-success-700 ring-success-200',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200',
  danger: 'bg-danger-50 text-danger-700 ring-danger-200',
  accent: 'bg-accent-50 text-accent-700 ring-accent-200',
};

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide ring-1 ring-inset',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
