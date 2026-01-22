'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import AdminGuard from '@/app/admin/AdminGuard';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { formatCurrency } from '@/app/lib/format';
import { sanitizeDecimalInput } from '@/app/lib/input';
import useAuth from '@/src/hooks/useAuth';
import {
  type UniformCategory,
  type UniformDTO,
  type UniformGender,
  UNIFORM_CATEGORIES,
  UNIFORM_GENDERS,
  UNIFORM_ITEM_KINDS,
  type UniformItemKind,
} from '@/src/types/uniform';

const CATEGORY_LABEL: Record<UniformCategory, string> = {
  escolar: 'Uniforme escolar',
  esportivo: 'Uniforme esportivo',
  acessorios: 'Acessórios',
};

const GENDER_LABEL: Record<UniformGender, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
  unissex: 'Unissex',
};

const ITEM_KIND_LABEL: Record<UniformItemKind, string> = {
  camiseta: 'Camiseta',
  blusa: 'Blusa',
  jaqueta: 'Jaqueta',
  calca: 'Calça',
  bermuda: 'Bermuda',
  saia: 'Saia',
  meia: 'Meia',
  acessorio: 'Acessório',
  outro: 'Outro',
};

function isNumericSizingKind(kind: UniformItemKind) {
  return kind === 'calca' || kind === 'bermuda' || kind === 'saia';
}

function getDefaultSizesTextForKind(kind: UniformItemKind) {
  return isNumericSizingKind(kind) ? '2, 4, 6, 8, 10, 12, 14' : 'PP, P, M, G, GG';
}

function formatUniformItemsSummary(uniform: UniformDTO) {
  const items = Array.isArray(uniform.items) ? uniform.items : [];
  if (items.length === 0) {
    return uniform.sizes.join(', ');
  }

  return items
    .map(item => {
      const qty = Number(item.quantity) > 1 ? ` x${item.quantity}` : '';
      const label = ITEM_KIND_LABEL[item.kind];
      return `${label}${qty}: ${(item.sizes ?? []).join(', ')}`;
    })
    .join(' | ');
}

type UniformItemFormValues = {
  kind: UniformItemKind;
  quantity: number;
  sizesText: string;
};

type UniformFormValues = {
  name: string;
  category: UniformCategory;
  gender: UniformGender;
  items: UniformItemFormValues[];
  price: number;
  description: string;
  imageSrc: string;
  imageAlt: string;
};

const createEmptyForm = (): UniformFormValues => ({
  name: '',
  category: 'escolar',
  gender: 'unissex',
  items: [
    {
      kind: 'camiseta',
      quantity: 1,
      sizesText: getDefaultSizesTextForKind('camiseta'),
    },
  ],
  price: 0,
  description: '',
  imageSrc: '',
  imageAlt: '',
});

export default function AdminUniformsPage() {
  const { accessToken } = useAuth();
  const [uniforms, setUniforms] = useState<UniformDTO[]>([]);
  const [formValues, setFormValues] = useState<UniformFormValues>(createEmptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = useMemo(() => editingId !== null, [editingId]);
  const isFormDisabled = submitting || !accessToken || loading;

  const fetchUniforms = useCallback(async () => {
    const response = await fetch('/api/uniforms', { cache: 'no-store' });
    const payload = (await response.json()) as { data?: UniformDTO[]; error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? 'Não foi possível carregar os uniformes.');
    }
    return payload.data ?? [];
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const uniformData = await fetchUniforms();
      setUniforms(uniformData);
      setError(null);
    } catch (err) {
      console.error('Failed to load uniforms', err);
      setError('Não foi possível carregar os dados. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, [fetchUniforms]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const authorizedRequest = useCallback(
    async <T,>(path: string, init: RequestInit): Promise<T> => {
      if (!accessToken) {
        throw new Error('Token de acesso ausente. Faça login novamente.');
      }

      const response = await fetch(path, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init.headers ?? {}),
        },
        ...init,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof (payload as { error?: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : 'Falha na requisição.';
        throw new Error(message);
      }

      return payload as T;
    },
    [accessToken],
  );

  const handleChange = (field: keyof UniformFormValues, value: string) => {
    setFormValues(prev => {
      if (field === 'price') {
        return { ...prev, price: Number(value) };
      }

      if (field === 'category') {
        return { ...prev, category: value as UniformCategory };
      }

      if (field === 'gender') {
        return { ...prev, gender: value as UniformGender };
      }

      return { ...prev, [field]: value };
    });
    setError(null);
  };

  const handleItemChange = (index: number, patch: Partial<UniformItemFormValues>) => {
    setFormValues(prev => {
      const nextItems = prev.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const updated = { ...item, ...patch };
        if (patch.kind && (!updated.sizesText || !updated.sizesText.trim())) {
          updated.sizesText = getDefaultSizesTextForKind(patch.kind);
        }

        if (patch.quantity !== undefined) {
          updated.quantity = Math.max(1, Math.floor(Number(patch.quantity) || 1));
        }

        return updated;
      });
      return { ...prev, items: nextItems };
    });
    setError(null);
  };

  const handleAddItem = () => {
    setFormValues(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { kind: 'camiseta', quantity: 1, sizesText: getDefaultSizesTextForKind('camiseta') },
      ],
    }));
    setError(null);
  };

  const handleRemoveItem = (index: number) => {
    setFormValues(prev => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) };
    });
    setError(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormValues(createEmptyForm());
    setError(null);
  };

  const parseSizes = (raw: string): string[] =>
    raw
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.name.trim()) {
      setError('Informe o nome do uniforme.');
      return;
    }

    const resolvedItems = formValues.items
      .map(item => {
        const sizes = parseSizes(item.sizesText);
        return {
          kind: item.kind,
          quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
          sizes,
        };
      })
      .filter(item => item.sizes.length > 0);

    if (resolvedItems.length === 0) {
      setError('Adicione pelo menos um item com tamanhos.');
      return;
    }

    if (formValues.price <= 0) {
      setError('Preço deve ser maior que zero.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name: formValues.name,
        category: formValues.category,
        gender: formValues.gender,
        items: resolvedItems,
        price: formValues.price,
        description: formValues.description.trim() || undefined,
        imageSrc: formValues.imageSrc.trim() || undefined,
        imageAlt: formValues.imageAlt.trim() || undefined,
      };

      if (isEditing && editingId) {
        await authorizedRequest<{ data: UniformDTO }>(`/api/uniforms/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await authorizedRequest<{ data: UniformDTO }>('/api/uniforms', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      await loadData();
      resetForm();
    } catch (err) {
      console.error('Failed to submit uniform', err);
      setError(err instanceof Error ? err.message : 'Falha ao salvar uniforme.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (id: string) => {
    const target = uniforms.find(item => item.id === id);
    if (!target) return;

    setEditingId(id);

    const targetItems = Array.isArray(target.items) && target.items.length > 0 ? target.items : [];
    const itemsForForm: UniformItemFormValues[] =
      targetItems.length > 0
        ? targetItems.map(item => ({
            kind: item.kind,
            quantity: item.quantity,
            sizesText: (item.sizes ?? []).join(', '),
          }))
        : [
            {
              kind: 'outro',
              quantity: 1,
              sizesText: target.sizes.join(', '),
            },
          ];

    setFormValues({
      name: target.name,
      category: target.category,
      gender: target.gender,
      price: target.price,
      items: itemsForForm,
      description: target.description ?? '',
      imageSrc: target.imageSrc ?? '',
      imageAlt: target.imageAlt ?? '',
    });
    setError(null);
  };

  const handleDelete = async (id: string) => {
    const target = uniforms.find(item => item.id === id);
    if (!target) return;

    const confirmed = window.confirm(`Remover ${target.name}? Esta ação é definitiva.`);
    if (!confirmed) return;

    try {
      setSubmitting(true);
      await authorizedRequest<{ data: UniformDTO }>(`/api/uniforms/${id}`, {
        method: 'DELETE',
      });
      await loadData();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error('Failed to delete uniform', err);
      setError(err instanceof Error ? err.message : 'Falha ao excluir uniforme.');
    } finally {
      setSubmitting(false);
    }
  };

  // Supplier relation removed; no lookup needed.

  return (
    <AdminGuard requiredRole="admin">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900">Catálogo de uniformes</h1>
          <p className="text-sm text-neutral-500">
            Gerencie itens, tamanhos disponíveis, precificação e imagens.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
            <table className="min-w-full divide-y divide-neutral-100 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Gênero</th>
                  <th className="px-4 py-3">Tamanhos</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {uniforms.map(uniform => (
                  <tr key={uniform.id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3 font-medium text-neutral-900">{uniform.name}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      <Badge tone="accent">{CATEGORY_LABEL[uniform.category]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{GENDER_LABEL[uniform.gender]}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {formatUniformItemsSummary(uniform)}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{formatCurrency(uniform.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-xs">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(uniform.id)}
                          disabled={isFormDisabled}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(uniform.id)}
                          disabled={isFormDisabled}
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {uniforms.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-neutral-500">
                      Nenhum uniforme cadastrado até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <aside className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/70 p-6 shadow-card">
            <h2 className="text-lg font-semibold text-brand-900">
              {isEditing ? 'Editar uniforme' : 'Cadastrar novo uniforme'}
            </h2>
            <p className="text-sm text-brand-700">
              Preencha os dados para atualizar o catálogo oficial de uniformes.
            </p>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label htmlFor="uniform-name" className="text-sm font-medium text-neutral-700">
                  Nome
                </label>
                <Input
                  id="uniform-name"
                  value={formValues.name}
                  onChange={event => handleChange('name', event.target.value)}
                  placeholder="Ex: Blusa manga longa"
                  required
                  disabled={isFormDisabled}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="uniform-category"
                    className="text-sm font-medium text-neutral-700"
                  >
                    Categoria
                  </label>
                  <select
                    id="uniform-category"
                    value={formValues.category}
                    onChange={event => handleChange('category', event.target.value)}
                    className="w-full rounded-card border border-border bg-surface px-md py-sm text-body text-text shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-primary/40"
                    disabled={isFormDisabled}
                  >
                    {UNIFORM_CATEGORIES.map(option => (
                      <option key={option} value={option}>
                        {CATEGORY_LABEL[option]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="uniform-gender" className="text-sm font-medium text-neutral-700">
                    Gênero
                  </label>
                  <select
                    id="uniform-gender"
                    value={formValues.gender}
                    onChange={event => handleChange('gender', event.target.value)}
                    className="w-full rounded-card border border-border bg-surface px-md py-sm text-body text-text shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-primary/40"
                    disabled={isFormDisabled}
                  >
                    {UNIFORM_GENDERS.map(option => (
                      <option key={option} value={option}>
                        {GENDER_LABEL[option]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-sm">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-neutral-700">Itens do kit</span>
                    <span className="text-xs text-neutral-500">
                      Defina os tipos de peças e os tamanhos de cada uma.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddItem}
                    disabled={isFormDisabled}
                  >
                    Adicionar item
                  </Button>
                </div>

                <div className="space-y-3">
                  {formValues.items.map((item, index) => (
                    <div
                      key={`${item.kind}-${index}`}
                      className="rounded-card border border-border bg-surface p-3"
                    >
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-neutral-600">Tipo</label>
                          <select
                            value={item.kind}
                            onChange={event => {
                              handleItemChange(index, {
                                kind: event.target.value as UniformItemKind,
                              });
                            }}
                            className="w-full rounded-card border border-border bg-surface px-md py-sm text-body text-text shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-primary/40"
                            disabled={isFormDisabled}
                          >
                            {UNIFORM_ITEM_KINDS.map(option => (
                              <option key={option} value={option}>
                                {ITEM_KIND_LABEL[option]}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-neutral-600">Quantidade</label>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            inputMode="numeric"
                            value={item.quantity}
                            onChange={event =>
                              handleItemChange(index, { quantity: Number(event.target.value) || 1 })
                            }
                            disabled={isFormDisabled}
                          />
                        </div>

                        <div className="space-y-1 sm:col-span-3">
                          <label className="text-xs font-medium text-neutral-600">
                            Tamanhos (separados por vírgula)
                          </label>
                          <Input
                            value={item.sizesText}
                            onChange={event => {
                              handleItemChange(index, { sizesText: event.target.value });
                            }}
                            placeholder={
                              isNumericSizingKind(item.kind)
                                ? 'Ex: 2, 4, 6, 8, 10, 12, 14'
                                : 'Ex: PP, P, M, G, GG'
                            }
                            required
                            disabled={isFormDisabled}
                          />
                        </div>
                      </div>

                      {formValues.items.length > 1 && (
                        <div className="mt-2 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            disabled={isFormDisabled}
                          >
                            Remover
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="uniform-price" className="text-sm font-medium text-neutral-700">
                  Preço
                </label>
                <Input
                  id="uniform-price"
                  type="number"
                  min={0}
                  step={0.01}
                  inputMode="decimal"
                  value={formValues.price}
                  onChange={event =>
                    handleChange('price', sanitizeDecimalInput(event.target.value, 2))
                  }
                  required
                  disabled={isFormDisabled}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="uniform-description"
                  className="text-sm font-medium text-neutral-700"
                >
                  Descrição (opcional)
                </label>
                <Input
                  id="uniform-description"
                  value={formValues.description}
                  onChange={event => handleChange('description', event.target.value)}
                  placeholder="Ex: Confeccionada em algodão orgânico"
                  disabled={isFormDisabled}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="uniform-image-src"
                    className="text-sm font-medium text-neutral-700"
                  >
                    URL da imagem (opcional)
                  </label>
                  <Input
                    id="uniform-image-src"
                    value={formValues.imageSrc}
                    onChange={event => handleChange('imageSrc', event.target.value)}
                    placeholder="https://..."
                    disabled={isFormDisabled}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="uniform-image-alt"
                    className="text-sm font-medium text-neutral-700"
                  >
                    Texto alternativo (opcional)
                  </label>
                  <Input
                    id="uniform-image-alt"
                    value={formValues.imageAlt}
                    onChange={event => handleChange('imageAlt', event.target.value)}
                    placeholder="Descrição da imagem"
                    disabled={isFormDisabled}
                  />
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <Button type="submit" fullWidth disabled={isFormDisabled}>
                  {submitting
                    ? 'Salvando...'
                    : isEditing
                      ? 'Salvar alterações'
                      : 'Adicionar uniforme'}
                </Button>
                {isEditing && (
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={resetForm}
                    disabled={isFormDisabled}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </aside>
        </div>
      </div>
    </AdminGuard>
  );
}
