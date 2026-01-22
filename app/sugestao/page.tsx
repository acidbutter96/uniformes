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
import { pickAvailablePantsSize, recommendPantsSize } from '@/app/lib/sizeEngine';
import { PANTS_SIZES } from '@/app/lib/pantsSizeTable';
import type { School } from '@/app/lib/models/school';
import type { Uniform } from '@/app/lib/models/uniform';
import {
  loadOrderFlowState,
  saveOrderFlowState,
  type OrderFlowState,
} from '@/app/lib/storage/order-flow';
import useAuth from '@/src/hooks/useAuth';

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
  const [selectedItems, setSelectedItems] = useState<Record<number, string>>({});

  const ITEM_LABEL: Record<string, string> = {
    camiseta: 'Camiseta',
    blusa: 'Blusa',
    jaqueta: 'Jaqueta',
    calca: 'Calça',
    bermuda: 'Bermuda',
    saia: 'Saia',
    meia: 'Meia',
    acessorio: 'Acessório',
    outro: 'Item',
  };

  const isNumericKind = (kind: string) => kind === 'calca' || kind === 'bermuda' || kind === 'saia';

  const looksLikePantsSizes = (sizes: unknown) => {
    if (!Array.isArray(sizes) || sizes.length === 0) return false;
    const normalized = sizes.map(v => String(v).trim()).filter(Boolean);
    return normalized.some(value => (PANTS_SIZES as readonly string[]).includes(value));
  };

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

    // Measurements are optional; user may choose size directly.
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

    const measurements = orderState?.measurements;
    const pantsSuggestion = measurements
      ? recommendPantsSize({
          height: measurements.height,
          waist: measurements.waist,
          hips: measurements.hips,
        })
      : null;
    const suggestedPantsSize =
      pantsSuggestion && pantsSuggestion.size !== 'MANUAL' ? pantsSuggestion.size : null;

    const uniformItems =
      Array.isArray(uniform.items) && uniform.items.length > 0
        ? uniform.items
        : [
            {
              kind: looksLikePantsSizes(uniform.sizes) ? 'calca' : 'outro',
              quantity: 1,
              sizes: Array.isArray(uniform.sizes) ? uniform.sizes : [],
            },
          ];

    const persisted = orderState?.selectedItems ?? [];
    const suggestionSize = orderState?.suggestion?.suggestion ?? null;

    const nextSelected: Record<number, string> = {};

    for (const [index, item] of uniformItems.entries()) {
      const sizes = Array.isArray(item.sizes) ? item.sizes : [];

      const fromPersisted = persisted[index]?.size;
      if (fromPersisted && sizes.includes(fromPersisted)) {
        nextSelected[index] = fromPersisted;
        continue;
      }

      if (suggestionSize && !isNumericKind(item.kind) && sizes.includes(suggestionSize)) {
        nextSelected[index] = suggestionSize;
        continue;
      }

      if (suggestedPantsSize && isNumericKind(item.kind)) {
        nextSelected[index] = pickAvailablePantsSize(sizes, suggestedPantsSize);
        continue;
      }

      if (sizes.length > 0) {
        nextSelected[index] = sizes[0];
      }
    }

    setSelectedItems(nextSelected);
  }, [
    uniform,
    orderState?.measurements,
    orderState?.selectedItems,
    orderState?.suggestion?.suggestion,
  ]);

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

    const { height, chest, waist, hips } = orderState.measurements;
    return [
      { label: 'Altura', value: `${height} cm` },
      { label: 'Tórax', value: `${chest} cm` },
      { label: 'Cintura', value: `${waist} cm` },
      { label: 'Quadril', value: `${hips} cm` },
    ];
  }, [orderState?.measurements]);

  const handleItemSizeSelect = (index: number, size: string) => {
    setSelectedItems(current => ({ ...current, [index]: size }));
    setSubmitError(null);
  };

  const uniformItems = useMemo(() => {
    if (!uniform) return [] as Array<{ kind: string; quantity: number; sizes: string[] }>;

    return Array.isArray(uniform.items) && uniform.items.length > 0
      ? uniform.items
      : [
          {
            kind: looksLikePantsSizes(uniform.sizes) ? 'calca' : 'outro',
            quantity: 1,
            sizes: Array.isArray(uniform.sizes) ? uniform.sizes : [],
          },
        ];
  }, [uniform]);

  const suggestedPantsSize = useMemo(() => {
    const measurements = orderState?.measurements;
    if (!measurements) return null;
    const pants = recommendPantsSize({
      height: measurements.height,
      waist: measurements.waist,
      hips: measurements.hips,
    });
    return pants.size === 'MANUAL' ? null : pants.size;
  }, [orderState?.measurements]);

  const hasSuggestionTarget = useMemo(() => {
    const suggestionSize = orderState?.suggestion?.suggestion;
    if (!suggestionSize) return false;
    return uniformItems.some(
      item => !isNumericKind(item.kind) && (item.sizes ?? []).includes(suggestionSize),
    );
  }, [orderState?.suggestion?.suggestion, uniformItems]);

  const handleConfirm = async () => {
    if (!orderState) return;

    const selections = uniformItems.map((item, index) => ({
      kind: item.kind,
      quantity: item.quantity ?? 1,
      size: selectedItems[index] ?? null,
      sizes: item.sizes ?? [],
    }));

    const missing = selections.find(entry => !entry.size || !entry.sizes.includes(entry.size));
    if (missing) {
      setSubmitError('Selecione um tamanho para cada item do kit para concluir a reserva.');
      return;
    }

    const selectionText = selections
      .map(entry => {
        const label = ITEM_LABEL[entry.kind] ?? 'Item';
        const qty = Number(entry.quantity) > 1 ? ` x${entry.quantity}` : '';
        return `${label}${qty} ${entry.size}`;
      })
      .join(' + ');

    if (!accessToken) {
      router.replace(`/login?returnTo=${encodeURIComponent('/sugestao')}`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    saveOrderFlowState({
      selectedItems: selections.map(entry => ({
        kind: entry.kind,
        quantity: entry.quantity,
        size: String(entry.size),
      })),
      selectedSize: selectionText,
    });

    setOrderState(current =>
      current
        ? {
            ...current,
            selectedItems: selections.map(entry => ({
              kind: entry.kind,
              quantity: entry.quantity,
              size: String(entry.size),
            })),
            selectedSize: selectionText,
          }
        : current,
    );

    // New flow: go to supplier selection step
    router.push('/fornecedor');
    setIsSubmitting(false);
  };

  const suggestion = orderState?.suggestion;
  const finalSize =
    orderState?.selectedSize ??
    (uniformItems.length > 0
      ? uniformItems
          .map((item, index) => {
            const label = ITEM_LABEL[item.kind] ?? 'Item';
            const qty = Number(item.quantity) > 1 ? ` x${item.quantity}` : '';
            const size = selectedItems[index];
            return size ? `${label}${qty} ${size}` : null;
          })
          .filter(Boolean)
          .join(' + ')
      : null);

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-2xl px-md py-2xl">
        <StepsHeader currentStep={5} />

        <section className="grid gap-xl lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="flex flex-col gap-lg">
            <header className="flex flex-col gap-sm">
              <span className="text-caption font-medium uppercase tracking-wide text-primary">
                Etapa 5 de 6
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

            {uniformItems.length > 0 && (
              <div className="flex flex-col gap-md">
                <div className="flex flex-col gap-xxs">
                  <h3 className="text-caption font-medium uppercase tracking-wide text-text-muted">
                    Escolha os tamanhos do kit
                  </h3>
                  <p className="text-body text-text-muted">
                    Se o uniforme tiver mais de uma peça, selecione o tamanho de cada item.
                  </p>
                </div>

                <div className="space-y-md">
                  {uniformItems.map((item, index) => {
                    const sizes = Array.isArray(item.sizes) ? item.sizes : [];
                    const selected = selectedItems[index] ?? null;
                    const label = ITEM_LABEL[item.kind] ?? 'Item';
                    const qty = Number(item.quantity) > 1 ? `x${item.quantity}` : null;

                    return (
                      <div
                        key={`${item.kind}-${index}`}
                        className="rounded-card bg-background p-md"
                      >
                        <div className="flex items-baseline justify-between gap-sm">
                          <h4 className="text-body font-semibold text-text">
                            {label}{' '}
                            {qty ? (
                              <span className="text-caption text-text-muted">{qty}</span>
                            ) : null}
                          </h4>
                          <span className="text-caption text-text-muted">
                            {selected ? `Selecionado: ${selected}` : 'Selecione um tamanho'}
                          </span>
                        </div>

                        <div className="mt-sm flex flex-wrap gap-sm">
                          {sizes.map(size => {
                            const isActive = selected === size;
                            const isSuggested = isNumericKind(item.kind)
                              ? suggestedPantsSize === size
                              : suggestion?.suggestion === size && hasSuggestionTarget;

                            return (
                              <button
                                key={size}
                                type="button"
                                onClick={() => handleItemSizeSelect(index, size)}
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
                                  <span className="ml-1 text-caption text-text-muted">
                                    (sugerido)
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {measurementEntries.length > 0 ? (
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

                {!suggestion && (
                  <div className="rounded-card bg-background px-md py-sm text-body text-text-muted">
                    Não foi possível sugerir um tamanho automaticamente. Ajuste manual recomendado.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-card bg-background px-md py-sm text-body text-text-muted">
                Você optou por escolher o tamanho sem informar medidas.
              </div>
            )}

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
                {suggestion && hasSuggestionTarget && (
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
