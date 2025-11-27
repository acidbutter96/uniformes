import { ReactNode } from 'react';
import { cn } from '@/app/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  delta?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  icon?: ReactNode;
  className?: string;
}

const toneMap: Record<NonNullable<MetricCardProps['tone']>, string> = {
  neutral: 'text-text-muted',
  success: 'text-success',
  warning: 'text-primary',
  danger: 'text-primary',
};

export default function MetricCard({
  title,
  value,
  delta,
  tone = 'neutral',
  icon,
  className,
}: MetricCardProps) {
  return (
    <article className={cn('card shadow-soft', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-caption uppercase tracking-wide text-text-muted">{title}</p>
          <p className="mt-sm text-h1 text-text">{value}</p>
        </div>
        {icon}
      </div>
      {delta && <p className={cn('mt-md text-body font-medium', toneMap[tone])}>{delta}</p>}
    </article>
  );
}
