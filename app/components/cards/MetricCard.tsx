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
  neutral: 'text-neutral-700',
  success: 'text-success-600',
  warning: 'text-warning-600',
  danger: 'text-danger-600',
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
    <article
      className={cn('rounded-2xl bg-white p-6 shadow-card ring-1 ring-neutral-100', className)}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-neutral-900">{value}</p>
        </div>
        {icon}
      </div>
      {delta && <p className={cn('mt-4 text-sm font-medium', toneMap[tone])}>{delta}</p>}
    </article>
  );
}
