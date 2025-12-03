'use client';

import { useCallback, useEffect, useState } from 'react';

import AdminGuard from '@/app/admin/AdminGuard';
import { Button } from '@/app/components/ui/Button';
// import { Input } from '@/app/components/ui/Input';
import useAuth from '@/src/hooks/useAuth';
import { type SupplierDTO } from '@/src/types/supplier';

// Removido: tipos de formulário de edição

// Removido: fábrica de formulário, não utilizada

export default function AdminSuppliersPage() {
  const { accessToken } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  // const [formValues, setFormValues] = useState<SupplierFormValues>(createEmptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // const isEditing = false;

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/suppliers?all=1', { cache: 'no-store' });
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

  // Removido: manipulação de formulário de edição

  // Removido: reset de formulário

  // Removido: submissão de formulário de edição/cadastro de fornecedor

  // Removido: modo de edição de fornecedor

  // Removido: exclusão de fornecedor

  const handleStatusChange = async (id: string, status: SupplierDTO['status']) => {
    try {
      setSubmitting(true);
      await authorizedRequest<{ data: SupplierDTO }>(`/api/suppliers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await fetchSuppliers();
    } catch (err) {
      console.error('Failed to update status', err);
      setError(err instanceof Error ? err.message : 'Falha ao atualizar status.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormDisabled = submitting || !accessToken || loading;

  return (
    <AdminGuard requiredRole="admin">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900">Fornecedores</h1>
          <p className="text-sm text-neutral-500">
            Admin pode apenas alterar status dos fornecedores.
          </p>
        </header>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid gap-6">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
            <table className="min-w-full divide-y divide-neutral-100 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Especialidade</th>
                  <th className="px-4 py-3">Lead time (dias)</th>
                  <th className="px-4 py-3">Avaliação</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-neutral-500">
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
                      <td className="px-4 py-3 text-neutral-600">
                        <select
                          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm"
                          value={supplier.status}
                          onChange={e =>
                            handleStatusChange(supplier.id, e.target.value as SupplierDTO['status'])
                          }
                          disabled={isFormDisabled}
                        >
                          <option value="active">Ativo</option>
                          <option value="pending">Pendente</option>
                          <option value="inactive">Inativo</option>
                          <option value="suspended">Suspenso</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-xs">
                          <Button variant="secondary" size="sm" disabled>
                            Edição desativada
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {!loading && suppliers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-neutral-500">
                      Nenhum fornecedor cadastrado até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Aside removido: formulário de edição/cadastro de fornecedor */}
        </div>
      </div>
    </AdminGuard>
  );
}
