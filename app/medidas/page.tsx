'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { StepsHeader } from '@/app/components/steps/StepsHeader';
import { MeasurementsForm } from '@/app/components/forms/MeasurementsForm';
import { Card } from '@/app/components/ui/Card';
import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { cn } from '@/app/lib/utils';
import {
  MAX_PANTS_SCORE,
  MAX_SCORE,
  pickAvailablePantsSize,
  recommendPantsSize,
  type RecommendPantsSizeResult,
  type RecommendSizeResult,
} from '@/app/lib/sizeEngine';
import { PANTS_SIZES } from '@/app/lib/pantsSizeTable';
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
const FALLBACK_PANTS_SIZES = [...PANTS_SIZES];

function isKnownSize(value: string): value is 'PP' | 'P' | 'M' | 'G' | 'GG' {
  return value === 'PP' || value === 'P' || value === 'M' || value === 'G' || value === 'GG';
}

function isNumericKind(kind: string) {
  return kind === 'calca' || kind === 'bermuda' || kind === 'saia';
}

function isPantsSize(value: string) {
  return (PANTS_SIZES as readonly string[]).includes(value);
}

function looksLikePantsSizes(sizes: string[] | undefined) {
  if (!Array.isArray(sizes) || sizes.length === 0) return false;
  const normalized = sizes.map(v => String(v).trim()).filter(Boolean);
  return normalized.some(isPantsSize);
}

export default function MeasurementsPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();

  const [recommendation, setRecommendation] = useState<RecommendSizeResult | null>(null);
  const [pantsRecommendation, setPantsRecommendation] = useState<RecommendPantsSizeResult | null>(
    null,
  );
  const [engineMessage, setEngineMessage] = useState<string | null>(null);
  const [measurementValues, setMeasurementValues] = useState<MeasurementsMap | null>(null);
  const [uniform, setUniform] = useState<Uniform | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('choice');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [child, setChild] = useState<{ name: string; age: number } | null>(null);

  const [pickedPantsSize, setPickedPantsSize] = useState<string | null>(null);

  const structuredItems = Array.isArray(uniform?.items) ? uniform.items : [];
  const hasStructuredItems = structuredItems.length > 0;

  const hasPantsItem =
    (hasStructuredItems && structuredItems.some(item => isNumericKind(String(item.kind ?? '')))) ||
    (!hasStructuredItems && looksLikePantsSizes(uniform?.sizes));

  const pantsAvailableSizes = hasStructuredItems
    ? structuredItems.find(item => isNumericKind(String(item.kind ?? '')))?.sizes
    : uniform?.sizes;

  const isKit =
    hasStructuredItems &&
    (structuredItems.length > 1 || structuredItems.some(item => Number(item.quantity) > 1));

  const isPantsUniform =
    (hasStructuredItems &&
      structuredItems.length === 1 &&
      isNumericKind(String(structuredItems[0]?.kind ?? ''))) ||
    (!hasStructuredItems && looksLikePantsSizes(uniform?.sizes));

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
    if (isKit) {
      router.push('/sugestao');
      return;
    }

    if (isPantsUniform) {
      if (!selectedSize) return;
      router.push('/sugestao');
      return;
    }

    if (!recommendation || recommendation.size === 'MANUAL') return;
    router.push('/sugestao');
  };

  const handleChooseSizeDirect = () => {
    if (isKit) {
      saveOrderFlowState({
        measurements: undefined,
        suggestion: undefined,
        selectedSize: undefined,
        selectedItems: undefined,
      });
      setMeasurementValues(null);
      setRecommendation(null);
      setPantsRecommendation(null);
      setPickedPantsSize(null);
      setEngineMessage(null);
      setSelectedSize(null);
      router.push('/sugestao');
      return;
    }

    // Clear measurement-based data (user chose manual size).
    saveOrderFlowState({
      measurements: undefined,
      suggestion: undefined,
      selectedSize: undefined,
      selectedItems: undefined,
    });
    setMeasurementValues(null);
    setRecommendation(null);
    setPantsRecommendation(null);
    setPickedPantsSize(null);
    setEngineMessage(null);
    setSelectedSize(null);
    setInputMode('size');
  };

  const handleChooseMeasurements = () => {
    // Clear manual size (user wants suggestion by measurements).
    saveOrderFlowState({ selectedSize: undefined, selectedItems: undefined });
    setSelectedSize(null);
    setPantsRecommendation(null);
    setPickedPantsSize(null);
    setInputMode('measurements');
    requestAnimationFrame(() => {
      const el = document.getElementById('measurements-form');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const sizeOptions =
    !isKit && Array.isArray(uniform?.sizes) && uniform?.sizes.length > 0
      ? uniform.sizes
      : isPantsUniform
        ? FALLBACK_PANTS_SIZES
        : FALLBACK_SIZES;

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    saveOrderFlowState({ selectedSize: size });
  };

  const handleAdvanceWithSize = () => {
    if (isKit) {
      router.push('/sugestao');
      return;
    }

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
                {isKit
                  ? 'Este uniforme possui mais de um item. Você escolherá os tamanhos por peça na próxima etapa.'
                  : 'Você pode preencher as medidas para receber uma sugestão automática, ou escolher o tamanho manualmente.'}
              </p>
              <div className="flex flex-col gap-sm sm:flex-row">
                <Button variant="secondary" type="button" onClick={handleChooseSizeDirect}>
                  {isKit ? 'Escolher tamanhos do kit' : 'Escolher tamanho direto'}
                </Button>
                <Button variant="primary" type="button" onClick={handleChooseMeasurements}>
                  {isKit ? 'Informar medidas (opcional)' : 'Informar medidas (recomendado)'}
                </Button>
              </div>
            </Card>

            {inputMode === 'size' && (
              <Card className="flex flex-col gap-md">
                <div className="flex flex-col gap-xxs">
                  <h2 className="text-h3 font-heading">Escolha o tamanho</h2>
                  <p className="text-body text-text-muted">
                    {isKit
                      ? 'Para kits, a escolha de tamanhos acontece na próxima etapa (por item).'
                      : 'Se preferir, escolha o tamanho manualmente e avance.'}
                  </p>
                </div>

                {!isKit && (
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
                )}

                <div className="flex flex-col gap-sm sm:flex-row">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAdvanceWithSize}
                    disabled={!isKit && !selectedSize}
                  >
                    {isKit ? 'Ir para escolha do kit' : 'Avançar'}
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
                onRecommendation={(next, data) => {
                  if (isPantsUniform) {
                    const measurementsMap: MeasurementsMap = {
                      age: typeof child?.age === 'number' ? child.age : undefined,
                      height: Number(data.height),
                      chest: Number(data.chest),
                      waist: Number(data.waist),
                      hips: Number(data.hips),
                    };

                    setMeasurementValues(measurementsMap);

                    const pants = recommendPantsSize({
                      height: measurementsMap.height,
                      waist: measurementsMap.waist,
                      hips: measurementsMap.hips,
                    });

                    setRecommendation(null);
                    setPantsRecommendation(pants);

                    if (pants.size === 'MANUAL') {
                      const message = 'Ajuste manual recomendado para maior precisão.';
                      setEngineMessage(message);
                      setSelectedSize(null);
                      saveOrderFlowState({
                        measurements: measurementsMap,
                        suggestion: undefined,
                        selectedSize: undefined,
                      });
                      return;
                    }

                    const picked = pickAvailablePantsSize(sizeOptions, pants.size);
                    const message =
                      'Sugestão de tamanho da calça calculada com base nas medidas informadas.';
                    setEngineMessage(message);
                    setSelectedSize(picked);

                    saveOrderFlowState({
                      measurements: measurementsMap,
                      suggestion: undefined,
                      selectedSize: picked,
                    });
                    return;
                  }

                  setRecommendation(next);
                  setPantsRecommendation(null);

                  const measurementsMap: MeasurementsMap = {
                    age: typeof child?.age === 'number' ? child.age : undefined,
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

                  if (!hasPantsItem) {
                    setPantsRecommendation(null);
                    setPickedPantsSize(null);
                    return;
                  }

                  const pants = recommendPantsSize({
                    height: measurementsMap.height,
                    waist: measurementsMap.waist,
                    hips: measurementsMap.hips,
                  });
                  setPantsRecommendation(pants);

                  if (pants.size === 'MANUAL') {
                    setPickedPantsSize(null);
                    return;
                  }

                  setPickedPantsSize(pickAvailablePantsSize(pantsAvailableSizes, pants.size));
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
                    <span className="text-h4 font-heading text-text">
                      {isKit ? 'Kit' : (selectedSize ?? '—')}
                    </span>
                  </div>
                  <p className="text-body text-text-muted">
                    {isKit
                      ? 'Você selecionará os tamanhos por item na próxima etapa.'
                      : 'Selecione um tamanho para avançar para a confirmação.'}
                  </p>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleAdvanceWithSize}
                    disabled={!isKit && !selectedSize}
                  >
                    {isKit ? 'Ir para escolha do kit' : 'Avançar para confirmação'}
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

                  {pickedPantsSize && (
                    <div className="flex items-baseline justify-between">
                      <span className="text-caption text-text-muted">Calça sugerida</span>
                      <span className="text-h4 font-heading text-text">{pickedPantsSize}</span>
                    </div>
                  )}

                  <p className="text-body text-text">
                    {engineMessage ?? 'Sugestão calculada com base nas medidas informadas.'}
                  </p>
                  {(() => {
                    const ratio = MAX_SCORE > 0 ? recommendation.score / MAX_SCORE : 0;
                    const clamped = Math.max(0, Math.min(1, ratio));
                    const percent = Math.round(clamped * 100);

                    const barColor =
                      clamped < 0.45
                        ? 'bg-red-500'
                        : clamped < 0.75
                          ? 'bg-yellow-500'
                          : 'bg-green-500';

                    return (
                      <div className="space-y-xxs">
                        <div className="flex items-center justify-between">
                          <span
                            className="text-caption text-text-muted"
                            title={`${percent}%`}
                            aria-label={`Precisão da sugestão: ${percent}%`}
                          >
                            Precisão da sugestão
                          </span>
                          <span className="sr-only">{percent}%</span>
                        </div>
                        <div
                          className="h-2 w-full overflow-hidden rounded-full bg-border"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={percent}
                        >
                          <div
                            className={cn('h-full transition-[width] duration-300', barColor)}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {recommendation.size === 'MANUAL' ? (
                    <Button
                      variant={isKit ? 'primary' : 'secondary'}
                      fullWidth
                      onClick={isKit ? handleAdvance : handleChooseSizeDirect}
                    >
                      {isKit ? 'Avançar para escolha do kit' : 'Escolher tamanho manualmente'}
                    </Button>
                  ) : (
                    <Button variant="primary" fullWidth onClick={handleAdvance}>
                      Avançar para confirmação
                    </Button>
                  )}
                </div>
              ) : pantsRecommendation ? (
                <div className="flex flex-col gap-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="text-caption text-text-muted">Tamanho sugerido (calça)</span>
                    <span className="text-h4 font-heading text-text">
                      {pantsRecommendation.size === 'MANUAL'
                        ? 'Ajuste manual recomendado'
                        : pantsRecommendation.size}
                    </span>
                  </div>
                  <p className="text-body text-text">
                    {engineMessage ?? 'Sugestão calculada com base nas medidas informadas.'}
                  </p>
                  {(() => {
                    const ratio =
                      MAX_PANTS_SCORE > 0 ? pantsRecommendation.score / MAX_PANTS_SCORE : 0;
                    const clamped = Math.max(0, Math.min(1, ratio));
                    const percent = Math.round(clamped * 100);

                    const barColor =
                      clamped < 0.45
                        ? 'bg-red-500'
                        : clamped < 0.75
                          ? 'bg-yellow-500'
                          : 'bg-green-500';

                    return (
                      <div className="space-y-xxs">
                        <div className="flex items-center justify-between">
                          <span
                            className="text-caption text-text-muted"
                            title={`${percent}%`}
                            aria-label={`Precisão da sugestão: ${percent}%`}
                          >
                            Precisão da sugestão
                          </span>
                          <span className="sr-only">{percent}%</span>
                        </div>
                        <div
                          className="h-2 w-full overflow-hidden rounded-full bg-border"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={percent}
                        >
                          <div
                            className={cn('h-full transition-[width] duration-300', barColor)}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {pantsRecommendation.size === 'MANUAL' ? (
                    <Button
                      variant={isKit ? 'primary' : 'secondary'}
                      fullWidth
                      onClick={isKit ? handleAdvance : handleChooseSizeDirect}
                    >
                      {isKit ? 'Avançar para escolha do kit' : 'Escolher tamanho manualmente'}
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
