'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { StepsHeader } from '@/app/components/steps/StepsHeader';
import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { cn } from '@/app/lib/utils';
import type { School } from '@/app/lib/models/school';
import type { Uniform } from '@/app/lib/models/uniform';
import {
  clearOrderFlowState,
  loadOrderFlowState,
  saveOrderFlowState,
  type OrderFlowState,
} from '@/app/lib/storage/order-flow';
import useAuth from '@/src/hooks/useAuth';
import type { ReservationDTO } from '@/src/types/reservation';

const FALLBACK_UNIFORM_IMAGE =
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80';

export default function SuggestionPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();

  const [orderState, setOrderState] = useState<OrderFlowState | null>(null);
  const [uniform, setUniform] = useState<Uniform | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    const state = loadOrderFlowState();

    if (!state.schoolId) {
      router.replace('/escola');
      return;
    }

    if (!state.uniformId) {
      router.replace('/uniformes');
      return;
    }

    if (!state.measurements || !state.suggestion) {
      router.replace('/medidas');
      return;
    }

    setSelectedSize(state.selectedSize ?? state.suggestion?.suggestion ?? null);
    setOrderState(state);
  }, [router]);

  useEffect(() => {
    if (!orderState) return;

    const snapshot = orderState;

    const controller = new AbortController();
    setLoadingDetails(true);

    async function loadDetails() {
      try {
        const [uniformsResponse, schoolsResponse] = await Promise.all([
          fetch('/api/uniforms', { signal: controller.signal }),
          fetch('/api/schools', { signal: controller.signal }),
        ]);

        if (!uniformsResponse.ok || !schoolsResponse.ok) {
          throw new Error('Não foi possível carregar os dados do uniforme ou da escola.');
        }

        const uniformsPayload = (await uniformsResponse.json()) as { data: Uniform[] };
        const schoolsPayload = (await schoolsResponse.json()) as { data: School[] };

        const matchedUniform = uniformsPayload.data?.find(item => item.id === snapshot.uniformId);
        const matchedSchool = schoolsPayload.data?.find(item => item.id === snapshot.schoolId);

        if (matchedUniform) {
          setUniform(matchedUniform);
        }

        if (matchedSchool) {
          setSchool(matchedSchool);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Failed to load confirmation details', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingDetails(false);
        }
      }
    }

    void loadDetails();

    return () => controller.abort();
  }, [orderState]);

  useEffect(() => {
    if (!uniform) return;

    const availableSizes = Array.isArray(uniform.sizes) ? uniform.sizes : [];

    setSelectedSize(current => {
      const candidate =
        current ?? orderState?.selectedSize ?? orderState?.suggestion?.suggestion ?? null;

      if (candidate && availableSizes.includes(candidate)) {
        return candidate;
      }

      const fallback =
        (orderState?.suggestion?.suggestion &&
        availableSizes.includes(orderState.suggestion.suggestion)
          ? orderState.suggestion.suggestion
          : availableSizes[0]) ?? null;

      if (fallback && fallback !== orderState?.selectedSize) {
        saveOrderFlowState({ selectedSize: fallback });
        setOrderState(prev => (prev ? { ...prev, selectedSize: fallback } : prev));
      }

      return fallback;
    });
  }, [uniform, orderState?.selectedSize, orderState?.suggestion?.suggestion]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/login?returnTo=${encodeURIComponent('/sugestao')}`);
      return;
    }

    const role = typeof user.role === 'string' ? user.role : null;
    setIsAdmin(role === 'admin');

    if (user.name && orderState) {
      saveOrderFlowState({ userName: String(user.name) });
    }
  }, [loading, user, router, orderState]);

  const measurementEntries = useMemo(() => {
    if (!orderState?.measurements) {
      return [];
    }

    const { age, height, weight, chest, waist, hips } = orderState.measurements;
    return [
      { label: 'Idade', value: `${age} anos` },
      { label: 'Altura', value: `${height} cm` },
      { label: 'Peso', value: `${weight} kg` },
      { label: 'Tórax', value: `${chest} cm` },
      { label: 'Cintura', value: `${waist} cm` },
      { label: 'Quadril', value: `${hips} cm` },
    ];
  }, [orderState?.measurements]);

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    saveOrderFlowState({ selectedSize: size });
    setOrderState(prev => (prev ? { ...prev, selectedSize: size } : prev));
    setSubmitError(null);
  };

  const handleConfirm = async () => {
    if (!orderState) return;

    if (!orderState.suggestion?.suggestion) {
      setSubmitError('Não encontramos a sugestão de tamanho. Volte e gere novamente.');
      return;
    }

    const sizeToSubmit = finalSize;

    if (!sizeToSubmit) {
      setSubmitError('Selecione um tamanho para concluir a reserva.');
      return;
    }

    if (!accessToken) {
      router.replace(`/login?returnTo=${encodeURIComponent('/sugestao')}`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    saveOrderFlowState({ selectedSize: sizeToSubmit });
    setOrderState(current => (current ? { ...current, selectedSize: sizeToSubmit } : current));

    // New flow: go to supplier selection step
    router.push('/fornecedor');
    setIsSubmitting(false);
  };

  const suggestion = orderState?.suggestion;
  const finalSize = selectedSize ?? orderState?.selectedSize ?? suggestion?.suggestion ?? null;
  const sizeOptions = uniform?.sizes ?? [];

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-2xl px-md py-2xl">
        <StepsHeader currentStep={4} />

        <section className="grid gap-xl lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="flex flex-col gap-lg">
            <header className="flex flex-col gap-sm">
              <span className="text-caption font-medium uppercase tracking-wide text-primary">
                Etapa 4 de 5
              </span>
              <h1 className="text-h2 font-heading">Confirme a reserva</h1>
              <p className="text-body text-text-muted">
                Revise as informações e confirme a reserva para concluir o processo.
              </p>
            </header>

            <div className="grid gap-lg sm:grid-cols-[200px_1fr]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-card bg-background">
                <Image
                  src={uniform?.imageSrc ?? FALLBACK_UNIFORM_IMAGE}
                  alt={uniform?.imageAlt ?? uniform?.name ?? 'Uniforme escolar'}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              </div>
              <div className="flex flex-col gap-sm">
                <h2 className="text-h3 font-heading">
                  {loadingDetails
                    ? 'Carregando uniforme...'
                    : (uniform?.name ?? 'Uniforme selecionado')}
                </h2>
                <p className="text-body text-text-muted">
                  {loadingDetails
                    ? 'Buscando detalhes do uniforme selecionado.'
                    : (uniform?.description ?? 'Uniforme escolhido para esta reserva.')}
                </p>
                {suggestion && (
                  <div className="flex flex-col gap-xs">
                    <span className="text-caption uppercase tracking-wide text-text-muted">
                      Tamanho sugerido
                    </span>
                    <span className="inline-flex items-center gap-xs rounded-card bg-primary/10 px-md py-xs text-body font-semibold text-primary">
                      {suggestion.suggestion}
                      <span aria-hidden>•</span>
                      Confiança {(suggestion.confidence * 100).toFixed(0)}%
                    </span>
                    <p className="text-body text-text">{suggestion.message}</p>
                  </div>
                )}
              </div>
            </div>

            {sizeOptions.length > 0 && (
              <div className="flex flex-col gap-xs">
                <div className="flex flex-col gap-xxs">
                  <h3 className="text-caption font-medium uppercase tracking-wide text-text-muted">
                    Escolha o tamanho para reservar
                  </h3>
                  <p className="text-body text-text-muted">
                    A sugestão é apenas um guia. Se preferir, selecione outro tamanho abaixo antes
                    de confirmar.
                  </p>
                </div>
                <div className="flex flex-wrap gap-sm">
                  {sizeOptions.map(size => {
                    const isActive = finalSize === size;
                    const isSuggested = suggestion?.suggestion === size;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleSizeSelect(size)}
                        disabled={isSubmitting}
                        aria-pressed={isActive}
                        className={cn(
                          'min-w-[64px] rounded-card border px-md py-xs text-body font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          isActive
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border bg-surface text-text hover:border-primary/50',
                          isSubmitting && 'opacity-60',
                        )}
                      >
                        <span>{size}</span>
                        {isSuggested && (
                          <span className="ml-1 text-caption text-text-muted">(sugerido)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-sm">
              <h3 className="text-caption font-medium uppercase tracking-wide text-text-muted">
                Medidas informadas
              </h3>
              <ul className="grid gap-xs min-[500px]:grid-cols-2">
                {measurementEntries.map(entry => (
                  <li
                    key={entry.label}
                    className="rounded-card bg-background px-md py-xs text-body"
                  >
                    <span className="text-text-muted">{entry.label}</span>
                    <span className="ml-2 font-semibold text-text">{entry.value}</span>
                  </li>
                ))}
              </ul>
            </div>

            {submitError && <Alert tone="danger" description={submitError} />}
            {isAdmin && (
              <Alert
                tone="warning"
                description="Contas administrativas não podem concluir reservas. Acesse com um perfil de responsável."
              />
            )}

            <div className="flex flex-col gap-sm md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-sm sm:flex-row sm:items-center md:order-2">
                <Button
                  size="lg"
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSubmitting || isAdmin}
                >
                  {isSubmitting ? 'Avançando...' : 'Avançar para fornecedores'}
                </Button>
                <Link
                  href="/medidas"
                  className={cn(
                    'inline-flex items-center justify-center gap-xs rounded-card border border-border bg-surface px-lg py-sm text-body font-semibold text-text transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  )}
                >
                  Ajustar medidas
                </Link>
              </div>
              <span className="text-caption text-text-muted md:order-1">
                Ao confirmar, sua reserva ficará disponível na página “Minhas Reservas”.
              </span>
            </div>
          </Card>

          <aside className="flex flex-col gap-md">
            <Card emphasis="muted" className="flex flex-col gap-sm">
              <h2 className="text-h3 font-heading">Resumo rápido</h2>
              <dl className="flex flex-col gap-xs text-body text-text">
                <div className="flex justify-between">
                  <dt className="text-text-muted">Escola</dt>
                  <dd className="font-medium">
                    {loadingDetails ? 'Carregando...' : (school?.name ?? 'Não identificada')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Cidade</dt>
                  <dd className="font-medium">
                    {loadingDetails ? 'Carregando...' : (school?.city ?? '—')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Uniforme</dt>
                  <dd className="font-medium">
                    {loadingDetails ? 'Carregando...' : (uniform?.name ?? '—')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Tamanho escolhido</dt>
                  <dd className="font-medium">{finalSize ?? '—'}</dd>
                </div>
                {suggestion && (
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Tamanho sugerido</dt>
                    <dd className="font-medium">{suggestion.suggestion}</dd>
                  </div>
                )}
              </dl>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}
