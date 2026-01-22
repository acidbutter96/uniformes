import { cn } from '@/app/lib/utils';

const steps = [
  { id: 'select-student', label: 'Selecionar Aluno' },
  { id: 'validate-school', label: 'Validar Escola' },
  { id: 'select-uniform', label: 'Selecionar Uniforme' },
  { id: 'inform-measurements', label: 'Informar Medidas' },
  { id: 'confirmation', label: 'Confirmação' },
  { id: 'select-supplier', label: 'Selecionar Fornecedor' },
];

export interface StepsHeaderProps {
  currentStep: number;
  className?: string;
}

export function StepsHeader({ currentStep, className }: StepsHeaderProps) {
  const activeStep = Math.min(Math.max(currentStep, 1), steps.length);

  return (
    <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] px-md">
      <nav
        aria-label="Etapas do processo"
        className={cn('w-full rounded-card bg-surface p-md shadow-soft', className)}
      >
        <ol className="grid gap-sm md:grid-cols-6 md:gap-md">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === activeStep;
            const isCompleted = stepNumber < activeStep;

            return (
              <li key={step.id} className="flex items-center gap-sm md:justify-center">
                <span
                  aria-hidden
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-body font-semibold transition-colors',
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
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
