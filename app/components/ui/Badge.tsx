import { HTMLAttributes } from 'react';
import { cn } from '@/app/lib/utils';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-background text-text-muted ring-border',
  success: 'bg-success/10 text-success ring-success/20',
  warning: 'bg-accent/20 text-accent ring-accent/30',
  danger: 'bg-primary text-white ring-primary/30',
  accent: 'bg-accent/15 text-primary ring-accent/30',
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
