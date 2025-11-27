import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/app/lib/utils';

type CardEmphasis = 'surface' | 'muted';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  emphasis?: CardEmphasis;
  interactive?: boolean;
  disabled?: boolean;
}

const emphasisClasses: Record<CardEmphasis, string> = {
  surface: 'bg-surface',
  muted: 'bg-background',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, emphasis = 'surface', interactive = false, disabled = false, tabIndex, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        tabIndex={tabIndex ?? (interactive ? 0 : undefined)}
        className={cn(
          'card text-text transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          emphasisClasses[emphasis],
          interactive && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-card',
          disabled && 'pointer-events-none opacity-60',
          className,
        )}
        {...props}
      />
    );
  },
);

Card.displayName = 'Card';

export type CardSectionProps = HTMLAttributes<HTMLDivElement>;

export const CardHeader = ({ className, ...props }: CardSectionProps) => (
  <div className={cn('mb-sm flex flex-col gap-xs', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-h3 font-heading text-text', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: CardSectionProps) => (
  <p className={cn('text-body text-text-muted', className)} {...props} />
);

export const CardContent = ({ className, ...props }: CardSectionProps) => (
  <div className={cn('flex flex-col gap-sm text-body text-text', className)} {...props} />
);

export const CardFooter = ({ className, ...props }: CardSectionProps) => (
  <div
    className={cn(
      'mt-md flex items-center justify-end gap-sm rounded-card bg-background/60 px-md py-sm text-sm text-text-muted',
      className,
    )}
    {...props}
  />
);
