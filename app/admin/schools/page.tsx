'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import AdminGuard from '@/app/admin/AdminGuard';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import useAuth from '@/src/hooks/useAuth';
import { SCHOOL_STATUSES, type SchoolStatus, type SchoolDTO } from '@/src/types/school';

type SchoolFormValues = {
  name: string;
  city: string;
  students: number;
  status: SchoolStatus;
};

const STATUS_OPTIONS: SchoolStatus[] = [...SCHOOL_STATUSES];

const statusTone: Record<SchoolStatus, 'success' | 'warning' | 'danger'> = {
  ativo: 'success',
  pendente: 'warning',
  inativo: 'danger',
};

const createEmptyForm = (): SchoolFormValues => ({
  name: '',
  city: '',
  students: 0,
  status: 'ativo',
});

export default function AdminSchoolsPage() {
  const { accessToken } = useAuth();
  const [schools, setSchools] = useState<SchoolDTO[]>([]);
  const [formValues, setFormValues] = useState<SchoolFormValues>(createEmptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/schools', { cache: 'no-store' });
      const payload = (await response.json()) as { data: SchoolDTO[] };
      setSchools(payload.data ?? []);
      setError(null);
    } catch (err) {
      console.error('Failed to load schools', err);
      setError('Não foi possível carregar escolas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

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
        const message = typeof (payload as { error?: unknown }).error === 'string'
          ? (payload as { error: string }).error
          : 'Falha na requisição.';
        throw new Error(message);
      }

      return payload as T;
    },
    [accessToken],
  );

  const handleChange = (field: keyof SchoolFormValues, value: string) => {
    setFormValues(prev => {
      if (field === 'students') {
        return { ...prev, students: Number(value) };
      }

      if (field === 'status') {
        return { ...prev, status: value as SchoolStatus };
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

    if (!formValues.name.trim() || !formValues.city.trim()) {
      setError('Preencha nome e cidade.');
      return;
    }

    if (formValues.students <= 0) {
      setError('Número de alunos deve ser maior que zero.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (isEditing && editingId) {
        await authorizedRequest<{ data: SchoolDTO }>(`/api/schools/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(formValues),
        });
      } else {
        await authorizedRequest<{ data: SchoolDTO }>('/api/schools', {
          method: 'POST',
          body: JSON.stringify(formValues),
        });
      }

      await fetchSchools();
      resetForm();
    } catch (err) {
      console.error('Failed to submit school', err);
      setError(err instanceof Error ? err.message : 'Falha ao salvar escola.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (id: string) => {
    const target = schools.find(item => item.id === id);
    if (!target) return;

    setEditingId(id);
    const { name, city, students, status } = target;
    setFormValues({ name, city, students, status });
    setError(null);
  };

  const handleDelete = async (id: string) => {
    const target = schools.find(item => item.id === id);
    if (!target) return;

    const confirmed = window.confirm(`Remover ${target.name}? Esta ação é definitiva.`);
    if (!confirmed) return;

    try {
      setSubmitting(true);
      await authorizedRequest<{ data: SchoolDTO }>(`/api/schools/${id}`, {
        method: 'DELETE',
      });
      await fetchSchools();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error('Failed to delete school', err);
      setError(err instanceof Error ? err.message : 'Falha ao excluir escola.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormDisabled = submitting || !accessToken;

  return (
    <AdminGuard requiredRole="admin">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900">Escolas</h1>
          <p className="text-sm text-neutral-500">Gerencie cadastros e status de integração.</p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
            <table className="min-w-full divide-y divide-neutral-100 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">Alunos</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-neutral-500" colSpan={5}>
                      Carregando escolas...
                    </td>
                  </tr>
                ) : schools.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-neutral-500" colSpan={5}>
                      Nenhuma escola cadastrada.
                    </td>
                  </tr>
                ) : (
                  schools.map(school => (
                    <tr key={school.id} className="hover:bg-brand-50/40">
                      <td className="px-4 py-3 font-medium text-neutral-900">{school.name}</td>
                      <td className="px-4 py-3 text-neutral-600">{school.city}</td>
                      <td className="px-4 py-3 text-neutral-600">{school.students}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone[school.status]}>{school.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-xs">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEdit(school.id)}
                            disabled={isFormDisabled}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(school.id)}
                            disabled={isFormDisabled}
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <aside className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/70 p-6 shadow-card">
            <h2 className="text-lg font-semibold text-brand-900">
              {isEditing ? 'Editar escola' : 'Cadastrar nova escola'}
            </h2>
            <p className="text-sm text-brand-700">
              {accessToken
                ? 'As alterações são aplicadas diretamente na base de dados.'
                : 'Faça login como administrador para gerenciar escolas.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label htmlFor="school-name" className="text-sm font-medium text-neutral-700">
                  Nome da escola
                </label>
                <Input
                  id="school-name"
                  value={formValues.name}
                  onChange={event => handleChange('name', event.target.value)}
                  placeholder="Ex: Colégio União"
                  required
                  disabled={isFormDisabled}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="school-city" className="text-sm font-medium text-neutral-700">
                  Cidade
                </label>
                <Input
                  id="school-city"
                  value={formValues.city}
                  onChange={event => handleChange('city', event.target.value)}
                  placeholder="Ex: Florianópolis"
                  required
                  disabled={isFormDisabled}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="school-students" className="text-sm font-medium text-neutral-700">
                  Número de alunos
                </label>
                <Input
                  id="school-students"
                  type="number"
                  min={1}
                  value={formValues.students}
                  onChange={event => handleChange('students', event.target.value)}
                  required
                  disabled={isFormDisabled}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="school-status" className="text-sm font-medium text-neutral-700">
                  Status
                </label>
                <select
                  id="school-status"
                  value={formValues.status}
                  onChange={event => handleChange('status', event.target.value)}
                  className="w-full rounded-card border border-border bg-surface px-md py-sm text-body text-text shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-primary/40"
                  disabled={isFormDisabled}
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-sm">
                <Button type="submit" fullWidth disabled={isFormDisabled}>
                  {submitting ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Adicionar escola'}
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
