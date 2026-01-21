'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { StepsHeader } from '@/app/components/steps/StepsHeader';
import { MeasurementsForm } from '@/app/components/forms/MeasurementsForm';
import { Card } from '@/app/components/ui/Card';
import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { cn } from '@/app/lib/utils';
import { MAX_SCORE, type RecommendSizeResult } from '@/app/lib/sizeEngine';
import type { Uniform } from '@/app/lib/models/uniform';
import type { School } from '@/app/lib/models/school';
import {
  loadOrderFlowState,
  saveOrderFlowState,
  type MeasurementsMap,
  type SuggestionData,
} from '@/app/lib/storage/order-flow';
import useAuth from '@/src/hooks/useAuth';

type InputMode = 'choice' | 'size' | 'measurements';

const FALLBACK_SIZES = ['PP', 'P', 'M', 'G', 'GG'];

function isKnownSize(value: string): value is 'PP' | 'P' | 'M' | 'G' | 'GG' {
  return value === 'PP' || value === 'P' || value === 'M' || value === 'G' || value === 'GG';
}

export default function MeasurementsPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();

  const [recommendation, setRecommendation] = useState<RecommendSizeResult | null>(null);
  const [engineMessage, setEngineMessage] = useState<string | null>(null);
  const [measurementValues, setMeasurementValues] = useState<MeasurementsMap | null>(null);
  const [uniform, setUniform] = useState<Uniform | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('choice');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [child, setChild] = useState<{ name: string; age: number } | null>(null);

  useEffect(() => {
    const state = loadOrderFlowState();

    if (!state.childId) {
      router.replace('/alunos');
      return;
    }

    if (!state.schoolId) {
      router.replace('/alunos');
      return;
    }

    if (!state.uniformId) {
      router.replace('/uniformes');
      return;
    }

    if (state.suggestion && isKnownSize(state.suggestion.suggestion)) {
      setRecommendation({ size: state.suggestion.suggestion, score: MAX_SCORE });
      setEngineMessage(state.suggestion.message ?? null);
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
    setChildId(state.childId ?? null);

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

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?returnTo=${encodeURIComponent('/medidas')}`);
      return;
    }

    if (!childId) {
      return;
    }

    const controller = new AbortController();

    async function loadChild() {
      try {
        type RawChild = {
          _id?: string;
          name?: unknown;
          age?: unknown;
        };

        const response = await fetch('/api/auth/me', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar aluno.');
        }

        const payload = await response.json();
        const rawChildren: RawChild[] = Array.isArray(payload?.data?.children)
          ? (payload.data.children as RawChild[])
          : [];

        const match = rawChildren.find(
          c => (typeof c?._id === 'string' ? c._id : undefined) === childId,
        );
        if (!match) {
          setChild(null);
          return;
        }

        const name = String(match.name ?? '').trim();
        const age = Number(match.age ?? 0);

        if (!name || !Number.isFinite(age) || age < 0) {
          setChild(null);
          return;
        }

        setChild({ name, age });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Failed to load child for measurements', error);
        }
      }
    }

    void loadChild();
    return () => controller.abort();
  }, [authLoading, user, accessToken, childId, router]);

  const handleAdvance = () => {
    if (!recommendation || recommendation.size === 'MANUAL') return;
    router.push('/sugestao');
  };

  const handleChooseSizeDirect = () => {
    // Clear measurement-based data (user chose manual size).
    saveOrderFlowState({ measurements: undefined, suggestion: undefined, selectedSize: undefined });
    setMeasurementValues(null);
    setRecommendation(null);
    setEngineMessage(null);
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
                lockedValues={child ? { age: child.age } : undefined}
                disabledFields={{ age: true }}
                onRecommendation={(next, data) => {
                  setRecommendation(next);

                  const measurementsMap: MeasurementsMap = {
                    age: Number(child?.age ?? data.age),
                    height: Number(data.height),
                    chest: Number(data.chest),
                    waist: Number(data.waist),
                    hips: Number(data.hips),
                  };

                  setMeasurementValues(measurementsMap);

                  if (next.size === 'MANUAL') {
                    const message = 'Ajuste manual recomendado para maior precisão.';
                    setEngineMessage(message);
                    saveOrderFlowState({ measurements: measurementsMap, suggestion: undefined });
                    return;
                  }

                  const suggestionData: SuggestionData = {
                    suggestion: next.size,
                    confidence: next.score / MAX_SCORE,
                    message: 'Sugestão calculada com base nas medidas informadas.',
                  };

                  setEngineMessage(suggestionData.message);
                  saveOrderFlowState({ measurements: measurementsMap, suggestion: suggestionData });
                }}
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
                    <dt className="text-text-muted">Aluno</dt>
                    <dd className="font-medium">{child?.name ?? 'Carregando...'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Idade</dt>
                    <dd className="font-medium">{child ? `${child.age} anos` : 'Carregando...'}</dd>
                  </div>
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
              ) : recommendation ? (
                <div className="flex flex-col gap-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="text-caption text-text-muted">Tamanho sugerido</span>
                    <span className="text-h4 font-heading text-text">
                      {recommendation.size === 'MANUAL'
                        ? 'Ajuste manual recomendado'
                        : recommendation.size}
                    </span>
                  </div>
                  <p className="text-body text-text">
                    {engineMessage ?? 'Sugestão calculada com base nas medidas informadas.'}
                  </p>
                  <p className="text-caption text-text-muted">
                    Pontuação: {recommendation.score}/{MAX_SCORE}
                  </p>

                  {recommendation.size === 'MANUAL' ? (
                    <Button variant="secondary" fullWidth onClick={handleChooseSizeDirect}>
                      Escolher tamanho manualmente
                    </Button>
                  ) : (
                    <Button variant="primary" fullWidth onClick={handleAdvance}>
                      Avançar para confirmação
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-body text-text-muted">
                  Selecione uma opção acima para continuar.
                </p>
              )}
            </Card>

            {recommendation?.size === 'MANUAL' && engineMessage && (
              <Alert
                tone="warning"
                heading="Ajuste manual recomendado"
                description={engineMessage}
              />
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
