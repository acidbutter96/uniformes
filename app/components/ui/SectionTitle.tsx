import { ReactNode } from 'react';
import { cn } from '@/app/lib/utils';

export interface SectionTitleProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: 'start' | 'center';
  className?: string;
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = 'start',
  className,
}: SectionTitleProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-xs text-text',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow && (
        <span className="text-caption font-medium uppercase tracking-wide text-text-muted">
          {eyebrow}
        </span>
      )}
      <h2 className="text-h2 font-heading">{title}</h2>
      {description && <p className="max-w-2xl text-body text-text-muted">{description}</p>}
    </header>
  );
}
