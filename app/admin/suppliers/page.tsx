'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import AdminGuard from '@/app/admin/AdminGuard';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import useAuth from '@/src/hooks/useAuth';
import { type SupplierDTO } from '@/src/types/supplier';

type SupplierFormValues = {
  name: string;
  specialty: string;
  leadTimeDays: number;
  rating: number;
};

const createEmptyForm = (): SupplierFormValues => ({
  name: '',
  specialty: '',
  leadTimeDays: 15,
  rating: 4,
});

export default function AdminSuppliersPage() {
  const { accessToken } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [formValues, setFormValues] = useState<SupplierFormValues>(createEmptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/suppliers', { cache: 'no-store' });
      const payload = (await response.json()) as { data: SupplierDTO[] };
      setSuppliers(payload.data ?? []);
      setError(null);
    } catch (err) {
      console.error('Failed to load suppliers', err);
      setError('Não foi possível carregar fornecedores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

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

  const handleChange = (field: keyof SupplierFormValues, value: string) => {
    setFormValues(prev => {
      if (field === 'leadTimeDays' || field === 'rating') {
        return { ...prev, [field]: Number(value) };
      }

      return { ...prev, [field]: value };
    });
    setError(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormValues(createEmptyForm());
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.name.trim() || !formValues.specialty.trim()) {
      setError('Preencha nome e especialidade.');
      return;
    }

    if (formValues.leadTimeDays <= 0) {
      setError('Lead time deve ser maior que zero.');
      return;
    }

    if (formValues.rating < 0 || formValues.rating > 5) {
      setError('Avaliação deve estar entre 0 e 5.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (isEditing && editingId) {
        await authorizedRequest<{ data: SupplierDTO }>(`/api/suppliers/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(formValues),
        });
      } else {
        await authorizedRequest<{ data: SupplierDTO }>('/api/suppliers', {
          method: 'POST',
          body: JSON.stringify(formValues),
        });
      }

      await fetchSuppliers();
      resetForm();
    } catch (err) {
      console.error('Failed to submit supplier', err);
      setError(err instanceof Error ? err.message : 'Falha ao salvar fornecedor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (id: string) => {
    const target = suppliers.find(item => item.id === id);
    if (!target) return;

    setEditingId(id);
    const { name, specialty, leadTimeDays, rating } = target;
    setFormValues({
      name,
      specialty: specialty ?? '',
      leadTimeDays: leadTimeDays ?? 0,
      rating: rating ?? 0,
    });
    setError(null);
  };

  const handleDelete = async (id: string) => {
    const target = suppliers.find(item => item.id === id);
    if (!target) return;

    const confirmed = window.confirm(`Remover ${target.name}? Esta ação é definitiva.`);
    if (!confirmed) return;

    try {
      setSubmitting(true);
      await authorizedRequest<{ data: SupplierDTO }>(`/api/suppliers/${id}`, {
        method: 'DELETE',
      });
      await fetchSuppliers();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error('Failed to delete supplier', err);
      setError(err instanceof Error ? err.message : 'Falha ao excluir fornecedor.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormDisabled = submitting || !accessToken || loading;
  const submitButtonLabel = submitting
    ? 'Salvando...'
    : isEditing
      ? 'Salvar alterações'
      : 'Adicionar fornecedor';

  return (
    <AdminGuard requiredRole="admin">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900">Fornecedores</h1>
          <p className="text-sm text-neutral-500">
            Gerencie os parceiros responsáveis pela produção e logística.
          </p>
        </header>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
            <table className="min-w-full divide-y divide-neutral-100 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Especialidade</th>
                  <th className="px-4 py-3">Lead time (dias)</th>
                  <th className="px-4 py-3">Avaliação</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-neutral-500">
                      Carregando fornecedores...
                    </td>
                  </tr>
                )}
                {!loading &&
                  suppliers.map(supplier => (
                    <tr key={supplier.id} className="hover:bg-brand-50/40">
                      <td className="px-4 py-3 font-medium text-neutral-900">{supplier.name}</td>
                      <td className="px-4 py-3 text-neutral-600">{supplier.specialty}</td>
                      <td className="px-4 py-3 text-neutral-600">{supplier.leadTimeDays}</td>
                      <td className="px-4 py-3 text-neutral-600">
                        {supplier.rating != null ? supplier.rating.toFixed(1) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-xs">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEdit(supplier.id)}
                            disabled={isFormDisabled}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(supplier.id)}
                            disabled={isFormDisabled}
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {!loading && suppliers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-neutral-500">
                      Nenhum fornecedor cadastrado até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <aside className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/70 p-6 shadow-card">
            <h2 className="text-lg font-semibold text-brand-900">
              {isEditing ? 'Editar fornecedor' : 'Cadastrar novo fornecedor'}
            </h2>
            <p className="text-sm text-brand-700">
              Utilize o formulário para simular cadastros antes da integração com o backend.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label htmlFor="supplier-name" className="text-sm font-medium text-neutral-700">
                  Nome
                </label>
                <Input
                  id="supplier-name"
                  value={formValues.name}
                  onChange={event => handleChange('name', event.target.value)}
                  placeholder="Ex: Tecelagem Brasil"
                  required
                  disabled={isFormDisabled}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="supplier-specialty"
                  className="text-sm font-medium text-neutral-700"
                >
                  Especialidade
                </label>
                <Input
                  id="supplier-specialty"
                  value={formValues.specialty}
                  onChange={event => handleChange('specialty', event.target.value)}
                  placeholder="Ex: Malharia premium"
                  required
                  disabled={isFormDisabled}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="supplier-leadtime" className="text-sm font-medium text-neutral-700">
                  Lead time (dias)
                </label>
                <Input
                  id="supplier-leadtime"
                  type="number"
                  min={1}
                  value={formValues.leadTimeDays}
                  onChange={event => handleChange('leadTimeDays', event.target.value)}
                  required
                  disabled={isFormDisabled}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="supplier-rating" className="text-sm font-medium text-neutral-700">
                  Avaliação
                </label>
                <Input
                  id="supplier-rating"
                  type="number"
                  step={0.1}
                  min={0}
                  max={5}
                  value={formValues.rating}
                  onChange={event => handleChange('rating', event.target.value)}
                  required
                  disabled={isFormDisabled}
                />
              </div>

              <div className="flex items-center gap-sm">
                <Button type="submit" fullWidth disabled={isFormDisabled}>
                  {submitButtonLabel}
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
