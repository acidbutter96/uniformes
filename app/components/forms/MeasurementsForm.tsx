'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/app/lib/utils';
import { sanitizeIntegerInput } from '@/app/lib/input';
import { MAX_SCORE, type RecommendSizeResult } from '@/app/lib/sizeEngine';
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

  autoSuggest?: boolean;
  suggestEndpoint?: string;
  suggestDebounceMs?: number;
  showSubmitButton?: boolean;
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

function isLetterSize(value: string): value is 'PP' | 'P' | 'M' | 'G' | 'GG' {
  return value === 'PP' || value === 'P' || value === 'M' || value === 'G' || value === 'GG';
}

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
  autoSuggest = false,
  suggestEndpoint = '/api/suggest-size',
  suggestDebounceMs = 350,
  showSubmitButton = true,
}: MeasurementsFormProps) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState(initialTouched);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [recommendation, setRecommendation] = useState<RecommendSizeResult | null>(null);

  const autoControllerRef = useRef<AbortController | null>(null);
  const autoDebounceRef = useRef<number | null>(null);
  const lastAutoPayloadRef = useRef<string>('');

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

  const parsedPayload = useMemo(() => {
    if (!isComplete || hasErrors) return null;

    return fields.reduce<MeasurementsData>((acc, field) => {
      acc[field.name] = Number(values[field.name]);
      return acc;
    }, {} as MeasurementsData);
  }, [hasErrors, isComplete, values]);

  useEffect(() => {
    if (!autoSuggest) {
      return;
    }

    if (!parsedPayload) {
      setRecommendation(null);
      return;
    }

    const payloadKey = JSON.stringify(parsedPayload);
    if (payloadKey === lastAutoPayloadRef.current) {
      return;
    }

    if (autoDebounceRef.current) {
      window.clearTimeout(autoDebounceRef.current);
      autoDebounceRef.current = null;
    }

    autoDebounceRef.current = window.setTimeout(async () => {
      autoControllerRef.current?.abort();
      const controller = new AbortController();
      autoControllerRef.current = controller;

      try {
        const response = await fetch(suggestEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedPayload),
          signal: controller.signal,
        });

        if (!response.ok) {
          // Ignore 422 (user is still typing / incomplete fields).
          if (response.status === 422) {
            setRecommendation(null);
            return;
          }

          throw new Error('Sugestão indisponível.');
        }

        const data = (await response.json().catch(() => ({}))) as {
          size?: string;
          score?: number;
        };

        const size = typeof data.size === 'string' ? data.size : 'MANUAL';
        const score = typeof data.score === 'number' ? data.score : 0;

        const nextRecommendation: RecommendSizeResult = {
          size: isLetterSize(size) ? size : 'MANUAL',
          score,
        };

        setRecommendation(nextRecommendation);
        onRecommendation?.(nextRecommendation, parsedPayload);
        lastAutoPayloadRef.current = payloadKey;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        console.error('Failed to auto-suggest size', error);
      }
    }, suggestDebounceMs);

    return () => {
      if (autoDebounceRef.current) {
        window.clearTimeout(autoDebounceRef.current);
        autoDebounceRef.current = null;
      }
      autoControllerRef.current?.abort();
      autoControllerRef.current = null;
    };
  }, [autoSuggest, onRecommendation, parsedPayload, suggestDebounceMs, suggestEndpoint]);

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

    if (autoSuggest) {
      // In auto mode we don't submit; suggestion is fetched as user types.
      return;
    }

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
        {!autoSuggest && showSubmitButton && (
          <Button type="submit" disabled={!isComplete || hasErrors || submitStatus === 'loading'}>
            {submitStatus === 'loading' ? 'Enviando…' : submitLabel}
          </Button>
        )}
      </div>

      {!autoSuggest && submitStatus === 'success' && (
        <Alert
          tone="success"
          heading={successMessage}
          description="Você pode revisar as informações a qualquer momento antes da confirmação."
        />
      )}

      {!autoSuggest && submitStatus === 'error' && (
        <Alert
          tone="danger"
          heading={errorMessage}
          description="Não se preocupe, nenhuma informação foi perdida."
        />
      )}
    </form>
  );
}
