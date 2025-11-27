import { cn } from '@/app/lib/utils';

const steps = [
  { id: 'validate-school', label: 'Validar Escola' },
  { id: 'select-uniform', label: 'Selecionar Uniforme' },
  { id: 'inform-measurements', label: 'Informar Medidas' },
  { id: 'confirmation', label: 'Confirmação' },
];

export interface StepsHeaderProps {
  currentStep: number;
  className?: string;
}

export function StepsHeader({ currentStep, className }: StepsHeaderProps) {
  const activeStep = Math.min(Math.max(currentStep, 1), steps.length);

  return (
    <nav
      aria-label="Etapas do processo"
      className={cn('rounded-card bg-surface p-md shadow-soft', className)}
    >
      <ol className="flex flex-col gap-sm md:flex-row md:items-center md:justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === activeStep;
          const isCompleted = stepNumber < activeStep;

          return (
            <li
              key={step.id}
              className="flex flex-col gap-xs md:flex-row md:items-center md:gap-sm"
            >
              <div className="flex items-center gap-sm">
                <span
                  aria-hidden
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border text-body font-semibold transition-colors',
                    isActive && 'border-primary bg-primary text-surface shadow-soft',
                    isCompleted && !isActive && 'border-primary/40 bg-primary/15 text-primary',
                    !isActive && !isCompleted && 'border-border bg-background text-text-muted',
                  )}
                >
                  {stepNumber}
                </span>
                <span
                  className={cn(
                    'text-body font-medium text-text transition-colors',
                    isActive && 'text-primary',
                    isCompleted && !isActive && 'text-primary',
                    !isActive && !isCompleted && 'text-text-muted',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <span className="hidden h-px w-12 flex-1 bg-border md:block" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
