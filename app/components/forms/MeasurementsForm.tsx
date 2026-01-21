'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/app/lib/utils';
import { sanitizeIntegerInput } from '@/app/lib/input';
import { MAX_SCORE, recommendSize, type RecommendSizeResult } from '@/app/lib/sizeEngine';
import type { MeasurementField, MeasurementsData } from '@/app/lib/measurements';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Alert } from '@/app/components/ui/Alert';

export type { MeasurementsData };

interface MeasurementsFormProps {
  id?: string;
  onSubmit?: (data: MeasurementsData) => Promise<void> | void;
  onRecommendation?: (recommendation: RecommendSizeResult, data: MeasurementsData) => void;
  lockedValues?: Partial<MeasurementsData>;
  disabledFields?: Partial<Record<MeasurementField, boolean>>;
  className?: string;
  submitLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  defaultValues?: Partial<MeasurementsData>;
}

type FieldConfig = {
  name: MeasurementField;
  label: string;
  placeholder: string;
  unit: string;
  example: string;
  min: number;
  max: number;
  step?: number;
};

const fields: FieldConfig[] = [
  {
    name: 'height',
    label: 'Altura',
    placeholder: 'Ex: 170',
    unit: 'cm',
    example: 'Ex.: 170 cm',
    min: 50,
    max: 230,
  },
  {
    name: 'chest',
    label: 'Tórax',
    placeholder: 'Ex: 95',
    unit: 'cm',
    example: 'Ex.: 95 cm',
    min: 30,
    max: 220,
  },
  {
    name: 'waist',
    label: 'Cintura',
    placeholder: 'Ex: 80',
    unit: 'cm',
    example: 'Ex.: 80 cm',
    min: 30,
    max: 220,
  },
  {
    name: 'hips',
    label: 'Quadril',
    placeholder: 'Ex: 100',
    unit: 'cm',
    example: 'Ex.: 100 cm',
    min: 30,
    max: 220,
  },
];

const initialValues: Record<MeasurementField, string> = {
  height: '',
  chest: '',
  waist: '',
  hips: '',
};

const initialTouched: Record<MeasurementField, boolean> = {
  height: false,
  chest: false,
  waist: false,
  hips: false,
};

export function MeasurementsForm({
  id,
  onSubmit,
  onRecommendation,
  lockedValues,
  disabledFields,
  className,
  submitLabel = 'Salvar medidas',
  successMessage = 'Medidas salvas!',
  errorMessage = 'Não foi possível salvar as medidas. Tente novamente.',
  defaultValues,
}: MeasurementsFormProps) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState(initialTouched);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [recommendation, setRecommendation] = useState<RecommendSizeResult | null>(null);

  useEffect(() => {
    if (!defaultValues) {
      return;
    }

    const nextValues = { ...initialValues };

    for (const field of fields) {
      const provided = defaultValues[field.name];
      if (provided === undefined || Number.isNaN(Number(provided))) {
        continue;
      }

      nextValues[field.name] = String(provided);
    }

    setValues(nextValues);
    setTouched(initialTouched);
    setSubmitStatus('idle');
    setRecommendation(null);
  }, [defaultValues]);

  useEffect(() => {
    if (!lockedValues) {
      return;
    }

    setValues(prev => {
      const next = { ...prev };

      for (const field of fields) {
        const provided = lockedValues[field.name];
        if (provided === undefined || Number.isNaN(Number(provided))) {
          continue;
        }

        next[field.name] = String(provided);
      }

      return next;
    });
  }, [lockedValues]);

  const errors = useMemo(() => {
    const next: Partial<Record<MeasurementField, string>> = {};

    for (const field of fields) {
      const raw = values[field.name].trim();
      if (!raw) {
        next[field.name] = 'Preencha este campo';
        continue;
      }

      const numeric = Number(raw);
      if (Number.isNaN(numeric)) {
        next[field.name] = 'Use apenas números';
        continue;
      }

      if (numeric < field.min || numeric > field.max) {
        next[field.name] = `Valor entre ${field.min} e ${field.max}`;
      }
    }

    return next;
  }, [values]);

  const hasErrors = Object.values(errors).some(Boolean);
  const isComplete = Object.values(values).every(value => value.trim() !== '');

  function handleChange(field: MeasurementField, nextValue: string) {
    const sanitized = sanitizeIntegerInput(nextValue);
    setValues(prev => ({ ...prev, [field]: sanitized }));
    setSubmitStatus('idle');
  }

  function handleBlur(field: MeasurementField) {
    setTouched(prev => ({ ...prev, [field]: true }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const allTouched = fields.reduce<Record<MeasurementField, boolean>>(
      (acc, { name }) => ({ ...acc, [name]: true }),
      {} as Record<MeasurementField, boolean>,
    );
    setTouched(allTouched);

    if (hasErrors) {
      return;
    }

    const payload = fields.reduce<MeasurementsData>((acc, field) => {
      acc[field.name] = Number(values[field.name]);
      return acc;
    }, {} as MeasurementsData);

    const nextRecommendation = recommendSize(payload);
    setRecommendation(nextRecommendation);
    onRecommendation?.(nextRecommendation, payload);

    setSubmitStatus('loading');

    try {
      if (onSubmit) {
        await onSubmit(payload);
      }

      setSubmitStatus('success');
    } catch (error) {
      console.error('Failed to submit measurements', error);
      setSubmitStatus('error');
    }
  }

  return (
    <form
      id={id}
      onSubmit={handleSubmit}
      noValidate
      className={cn('flex flex-col gap-md rounded-card bg-surface p-md shadow-soft', className)}
    >
      <div className="flex flex-col gap-xs">
        <h2 className="text-h3 font-heading text-text">Medidas da Pessoa</h2>
        <p className="text-body text-text-muted">
          Use medidas reais de quem vai vestir o uniforme — infantil, EJA ou adulto.
        </p>
      </div>

      <div className="grid gap-md md:grid-cols-2">
        {fields.map(field => {
          const isInvalid = Boolean(errors[field.name]);
          const showError = isInvalid && touched[field.name];
          const step = typeof field.step === 'number' ? field.step : 1;
          const inputMode = 'numeric';
          const isDisabled = Boolean(disabledFields?.[field.name]);

          return (
            <label key={field.name} className="flex flex-col gap-xs text-body text-text">
              <span className="font-medium text-text">{field.label}</span>
              <div className="flex items-center gap-sm">
                <Input
                  type="number"
                  inputMode={inputMode}
                  placeholder={field.placeholder}
                  value={values[field.name]}
                  min={field.min}
                  max={field.max}
                  step={step}
                  onChange={event => handleChange(field.name, event.target.value)}
                  onBlur={() => handleBlur(field.name)}
                  aria-invalid={isInvalid}
                  aria-describedby={`${field.name}-example ${field.name}-error`}
                  className="flex-1"
                  disabled={isDisabled}
                />
                <span className="shrink-0 rounded-card bg-background px-sm py-xxs text-body text-text-muted">
                  {field.unit}
                </span>
              </div>
              <span id={`${field.name}-example`} className="text-caption text-text-muted">
                {field.example}
              </span>
              {showError && (
                <span
                  id={`${field.name}-error`}
                  role="alert"
                  className="text-caption font-medium text-primary"
                >
                  {errors[field.name]}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {recommendation && (
        <div className="rounded-card border border-border bg-background px-md py-sm">
          <div className="flex items-baseline justify-between gap-md">
            <span className="text-caption font-medium uppercase tracking-wide text-text-muted">
              Recomendação
            </span>
            <span className="text-h4 font-heading text-text">
              {recommendation.size === 'MANUAL' ? 'Ajuste manual recomendado' : recommendation.size}
            </span>
          </div>
          <p className="mt-1 text-caption text-text-muted">
            Pontuação: {recommendation.score}/{MAX_SCORE}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-sm md:flex-row md:items-center md:justify-between">
        <p className="text-caption text-text-muted">Todos os campos são obrigatórios.</p>
        <Button type="submit" disabled={!isComplete || hasErrors || submitStatus === 'loading'}>
          {submitStatus === 'loading' ? 'Enviando…' : submitLabel}
        </Button>
      </div>

      {submitStatus === 'success' && (
        <Alert
          tone="success"
          heading={successMessage}
          description="Você pode revisar as informações a qualquer momento antes da confirmação."
        />
      )}

      {submitStatus === 'error' && (
        <Alert
          tone="danger"
          heading={errorMessage}
          description="Não se preocupe, nenhuma informação foi perdida."
        />
      )}
    </form>
  );
}
