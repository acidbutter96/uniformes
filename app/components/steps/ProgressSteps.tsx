import { cn } from '@/app/lib/utils';

interface ProgressStepsProps {
  steps: Array<{ id: string; label: string; description?: string }>;
  currentStepId: string;
}

export default function ProgressSteps({ steps, currentStepId }: ProgressStepsProps) {
  const activeIndex = steps.findIndex(step => step.id === currentStepId);

  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        const isCompleted = index < activeIndex;

        return (
          <li
            key={step.id}
            className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
          >
            <div
              className={cn(
                'mt-1 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold',
                {
                  'border-brand-500 bg-brand-50 text-brand-600': isActive,
                  'border-success-500 bg-success-50 text-success-600': isCompleted,
                  'border-neutral-200 bg-neutral-50 text-neutral-500': !isActive && !isCompleted,
                },
              )}
            >
              {index + 1}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-neutral-800">{step.label}</p>
              {step.description && <p className="text-xs text-neutral-500">{step.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
