'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/app/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

type MeasurementField = 'age' | 'height' | 'weight' | 'chest' | 'waist' | 'hips';

export interface MeasurementsData {
  age: number;
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hips: number;
}

interface ChildMeasurementsFormProps {
  onSubmit?: (data: MeasurementsData) => Promise<void> | void;
  className?: string;
  submitLabel?: string;
  successMessage?: string;
  errorMessage?: string;
}

type FieldConfig = {
  name: MeasurementField;
  label: string;
  placeholder: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
};

const fields: FieldConfig[] = [
  { name: 'age', label: 'Idade', placeholder: 'Ex: 9', unit: 'anos', min: 1, max: 18, step: 1 },
  { name: 'height', label: 'Altura', placeholder: 'Ex: 135', unit: 'cm', min: 50, max: 200 },
  { name: 'weight', label: 'Peso', placeholder: 'Ex: 32', unit: 'kg', min: 10, max: 120 },
  { name: 'chest', label: 'Tórax', placeholder: 'Ex: 68', unit: 'cm', min: 30, max: 150 },
  { name: 'waist', label: 'Cintura', placeholder: 'Ex: 60', unit: 'cm', min: 30, max: 150 },
  { name: 'hips', label: 'Quadril', placeholder: 'Ex: 70', unit: 'cm', min: 30, max: 150 },
];

const initialValues: Record<MeasurementField, string> = {
  age: '',
  height: '',
  weight: '',
  chest: '',
  waist: '',
  hips: '',
};

export function ChildMeasurementsForm({
  onSubmit,
  className,
  submitLabel = 'Salvar medidas',
  successMessage = 'Medidas salvas!',
  errorMessage = 'Não foi possível salvar as medidas. Tente novamente.',
}: ChildMeasurementsFormProps) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState<Record<MeasurementField, boolean>>({
    age: false,
    height: false,
    weight: false,
    chest: false,
    waist: false,
    hips: false,
  });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

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
    setValues(prev => ({ ...prev, [field]: nextValue }));
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
      onSubmit={handleSubmit}
      noValidate
      className={cn('flex flex-col gap-md rounded-card bg-surface p-md shadow-soft', className)}
    >
      <div className="flex flex-col gap-xs">
        <h2 className="text-h3 font-heading text-text">Medidas da Criança</h2>
        <p className="text-body text-text-muted">
          Informe os números com calma. Você pode atualizar essas informações depois se precisar.
        </p>
      </div>

      <div className="grid gap-md md:grid-cols-2">
        {fields.map(field => {
          const isInvalid = Boolean(errors[field.name]);
          const showError = isInvalid && touched[field.name];

          return (
            <label key={field.name} className="flex flex-col gap-xs text-body text-text">
              <span className="font-medium text-text">{field.label}</span>
              <Input
                type="number"
                inputMode="decimal"
                placeholder={`${field.placeholder} ${field.unit}`}
                value={values[field.name]}
                min={field.min}
                max={field.max}
                step={field.step ?? 0.1}
                onChange={event => handleChange(field.name, event.target.value)}
                onBlur={() => handleBlur(field.name)}
                aria-invalid={isInvalid}
                aria-describedby={`${field.name}-helper ${field.name}-error`}
              />
              <span id={`${field.name}-helper`} className="text-caption text-text-muted">
                {`Entre ${field.min} e ${field.max} ${field.unit}`}
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

      <div className="flex flex-col gap-sm md:flex-row md:items-center md:justify-between">
        <p className="text-caption text-text-muted">
          Todos os campos são obrigatórios.
        </p>
        <Button type="submit" disabled={!isComplete || hasErrors || submitStatus === 'loading'}>
          {submitStatus === 'loading' ? 'Enviando…' : submitLabel}
        </Button>
      </div>

      {submitStatus === 'success' && (
        <Alert tone="success" heading={successMessage} description="Você pode revisar as informações a qualquer momento antes da confirmação." />
      )}

      {submitStatus === 'error' && (
        <Alert tone="danger" heading={errorMessage} description="Não se preocupe, nenhuma informação foi perdida." />
      )}
    </form>
  );
}
