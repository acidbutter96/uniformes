'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { StepsHeader } from '@/app/components/steps/StepsHeader';
import { MeasurementsForm, type MeasurementsData } from '@/app/components/forms/MeasurementsForm';
import { Card } from '@/app/components/ui/Card';
import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { cn } from '@/app/lib/utils';
import type { Uniform } from '@/app/lib/models/uniform';
import type { School } from '@/app/lib/models/school';
import {
  loadOrderFlowState,
  saveOrderFlowState,
  type MeasurementsMap,
  type SuggestionData,
} from '@/app/lib/storage/order-flow';

interface SuggestionResult {
  suggestion: string;
  confidence: number;
  message: string;
}

type InputMode = 'choice' | 'size' | 'measurements';

const FALLBACK_SIZES = ['PP', 'P', 'M', 'G', 'GG'];

export default function MeasurementsPage() {
  const router = useRouter();
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [measurementValues, setMeasurementValues] = useState<MeasurementsMap | null>(null);
  const [uniform, setUniform] = useState<Uniform | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('choice');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    const state = loadOrderFlowState();

    if (!state.schoolId) {
      router.replace('/alunos');
      return;
    }

    if (!state.uniformId) {
      router.replace('/uniformes');
      return;
    }

    if (state.suggestion) {
      setResult(state.suggestion);
    }

    if (state.measurements) {
      setMeasurementValues(state.measurements);
    }

    if (state.measurements) {
      setInputMode('measurements');
    } else if (state.selectedSize) {
      setInputMode('size');
    } else {
      setInputMode('choice');
    }

    setSelectedSize(state.selectedSize ?? null);

    const fetchDetails = async () => {
      try {
        const [uniformsResponse, schoolsResponse] = await Promise.all([
          fetch('/api/uniforms'),
          fetch('/api/schools'),
        ]);

        if (!uniformsResponse.ok || !schoolsResponse.ok) {
          throw new Error('Não foi possível carregar os dados necessários.');
        }

        const uniformsPayload = (await uniformsResponse.json()) as { data: Uniform[] };
        const schoolsPayload = (await schoolsResponse.json()) as { data: School[] };

        const matchedUniform = uniformsPayload.data?.find(item => item.id === state.uniformId);
        const matchedSchool = schoolsPayload.data?.find(item => item.id === state.schoolId);

        if (matchedUniform) {
          setUniform(matchedUniform);
        }

        if (matchedSchool) {
          setSchool(matchedSchool);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchDetails();
  }, [router]);

  async function handleSubmit(data: MeasurementsData) {
    setResult(null);
    setApiError(null);

    const response = await fetch('/api/mock/suggest-size', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message = payload?.error ?? 'Erro ao contactar API.';
      setApiError(message);
      throw new Error(message);
    }

    const payload = (await response.json()) as SuggestionResult;
    setResult(payload);

    const measurementsMap: MeasurementsMap = {
      age: Number(data.age),
      height: Number(data.height),
      weight: Number(data.weight),
      chest: Number(data.chest),
      waist: Number(data.waist),
      hips: Number(data.hips),
    };

    const suggestionData: SuggestionData = {
      suggestion: payload.suggestion,
      confidence: payload.confidence,
      message: payload.message,
    };

    saveOrderFlowState({ measurements: measurementsMap, suggestion: suggestionData });
    setMeasurementValues(measurementsMap);
    setApiError(null);
  }

  const handleAdvance = () => {
    if (!result) return;
    router.push('/sugestao');
  };

  const handleChooseSizeDirect = () => {
    // Clear measurement-based data (user chose manual size).
    saveOrderFlowState({ measurements: undefined, suggestion: undefined, selectedSize: undefined });
    setMeasurementValues(null);
    setResult(null);
    setApiError(null);
    setSelectedSize(null);
    setInputMode('size');
  };

  const handleChooseMeasurements = () => {
    // Clear manual size (user wants suggestion by measurements).
    saveOrderFlowState({ selectedSize: undefined });
    setSelectedSize(null);
    setInputMode('measurements');
    requestAnimationFrame(() => {
      const el = document.getElementById('measurements-form');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const sizeOptions =
    Array.isArray(uniform?.sizes) && uniform?.sizes.length > 0 ? uniform.sizes : FALLBACK_SIZES;

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    saveOrderFlowState({ selectedSize: size });
  };

  const handleAdvanceWithSize = () => {
    if (!selectedSize) return;
    router.push('/sugestao');
  };

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-2xl px-md py-2xl">
        <StepsHeader currentStep={4} />

        <section className="grid gap-xl lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-xl">
            <Card className="flex flex-col gap-sm">
              <h2 className="text-h3 font-heading">Como você prefere informar o tamanho?</h2>
              <p className="text-body text-text-muted">
                Você pode preencher as medidas para receber uma sugestão automática, ou escolher o
                tamanho manualmente.
              </p>
              <div className="flex flex-col gap-sm sm:flex-row">
                <Button variant="secondary" type="button" onClick={handleChooseSizeDirect}>
                  Escolher tamanho direto
                </Button>
                <Button variant="primary" type="button" onClick={handleChooseMeasurements}>
                  Informar medidas (recomendado)
                </Button>
              </div>
            </Card>

            {inputMode === 'size' && (
              <Card className="flex flex-col gap-md">
                <div className="flex flex-col gap-xxs">
                  <h2 className="text-h3 font-heading">Escolha o tamanho</h2>
                  <p className="text-body text-text-muted">
                    Se preferir, escolha o tamanho manualmente e avance.
                  </p>
                </div>

                <div className="flex flex-wrap gap-sm">
                  {sizeOptions.map(size => {
                    const isActive = selectedSize === size;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleSizeSelect(size)}
                        aria-pressed={isActive}
                        className={cn(
                          'min-w-[64px] rounded-card border px-md py-xs text-body font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          isActive
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border bg-surface text-text hover:border-primary/50',
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-sm sm:flex-row">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAdvanceWithSize}
                    disabled={!selectedSize}
                  >
                    Avançar
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleChooseMeasurements}>
                    Prefiro informar medidas
                  </Button>
                </div>
              </Card>
            )}

            {inputMode === 'measurements' && (
              <MeasurementsForm
                id="measurements-form"
                onSubmit={handleSubmit}
                submitLabel="Sugerir tamanho"
                successMessage="Sugestão enviada!"
                errorMessage="Não foi possível gerar uma sugestão."
                defaultValues={measurementValues ?? undefined}
              />
            )}
          </div>

          <aside className="flex flex-col gap-md">
            <Card emphasis="muted" className="flex flex-col gap-sm">
              <h2 className="text-h3 font-heading">Seleção atual</h2>
              {uniform && school ? (
                <dl className="flex flex-col gap-xs text-body text-text">
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Escola</dt>
                    <dd className="font-medium">{school.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Cidade</dt>
                    <dd className="font-medium">{school.city}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Uniforme</dt>
                    <dd className="font-medium">{uniform.name}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-body text-text-muted">
                  Carregando informações da escola e uniforme selecionados.
                </p>
              )}
            </Card>

            <Card emphasis="muted" className="flex flex-col gap-sm">
              <h2 className="text-h3 font-heading">Resultado</h2>
              {inputMode === 'size' ? (
                <div className="flex flex-col gap-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="text-caption text-text-muted">Tamanho selecionado</span>
                    <span className="text-h4 font-heading text-text">{selectedSize ?? '—'}</span>
                  </div>
                  <p className="text-body text-text-muted">
                    Selecione um tamanho para avançar para a confirmação.
                  </p>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleAdvanceWithSize}
                    disabled={!selectedSize}
                  >
                    Avançar para confirmação
                  </Button>
                </div>
              ) : result ? (
                <div className="flex flex-col gap-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="text-caption text-text-muted">Tamanho sugerido</span>
                    <span className="text-h4 font-heading text-text">{result.suggestion}</span>
                  </div>
                  <p className="text-body text-text">{result.message}</p>
                  <p className="text-caption text-text-muted">
                    Confiança estimada: {(result.confidence * 100).toFixed(0)}%
                  </p>
                  <Button variant="primary" fullWidth onClick={handleAdvance}>
                    Avançar para confirmação
                  </Button>
                </div>
              ) : (
                <p className="text-body text-text-muted">
                  Selecione uma opção acima para continuar.
                </p>
              )}
            </Card>

            {apiError && (
              <Alert tone="danger" heading="Erro ao sugerir tamanho" description={apiError} />
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
