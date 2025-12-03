'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import AdminGuard from '@/app/admin/AdminGuard';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import useAuth from '@/src/hooks/useAuth';
import { type SupplierDTO } from '@/src/types/supplier';

// Removido: tipos de formulário de edição

// Removido: fábrica de formulário, não utilizada

export default function AdminSuppliersPage() {
  const { accessToken } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [newName, setNewName] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

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

  const handleCreateSupplier = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      await authorizedRequest<{ data: SupplierDTO }>(`/api/admin/suppliers`, {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          cnpj: newCnpj || undefined,
          specialty: newSpecialty || undefined,
          phone: newPhone || undefined,
        }),
      });
      setNewName('');
      setNewCnpj('');
      setNewSpecialty('');
      setNewPhone('');
      await fetchSuppliers();
    } catch (err) {
      console.error('Failed to create supplier', err);
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar o fornecedor.');
    } finally {
      setSubmitting(false);
    }
  };

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

  // Inline CNPJ formatting
  const digitsOnly = (value: string) => value.replace(/\D/g, '');
  const formatCnpj = (value: string) => {
    const digits = digitsOnly(value).slice(0, 14);
    const p1 = digits.slice(0, 2);
    const p2 = digits.slice(2, 5);
    const p3 = digits.slice(5, 8);
    const p4 = digits.slice(8, 12);
    const p5 = digits.slice(12, 14);
    if (digits.length <= 2) return p1;
    if (digits.length <= 5) return `${p1}.${p2}`;
    if (digits.length <= 8) return `${p1}.${p2}.${p3}`;
    if (digits.length <= 12) return `${p1}.${p2}.${p3}/${p4}`;
    return `${p1}.${p2}.${p3}/${p4}-${p5}`;
  };

  // Modal: Esc to close + focus trap
  useEffect(() => {
    if (!isModalOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        return;
      }
      if (e.key === 'Tab') {
        const root = modalRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter(el => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !root.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !root.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);

    // Autofocus first input
    const firstInput = modalRef.current?.querySelector<HTMLInputElement>('input');
    firstInput?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isModalOpen]);

  return (
    <AdminGuard requiredRole="admin">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900">Fornecedores</h1>
          <p className="text-sm text-neutral-500">
            Admin pode cadastrar fornecedores sem usuário (status pendente) e alterar status apenas
            quando houver usuário associado.
          </p>
        </header>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid gap-6">
          <div className="flex items-center justify-between">
            <div />
            <Button onClick={() => setIsModalOpen(true)}>Cadastrar fornecedor</Button>
          </div>
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
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40"
                aria-hidden="true"
                onClick={() => setIsModalOpen(false)}
              />
              <div
                ref={modalRef}
                className="relative z-10 w-full max-w-xl rounded-2xl border border-neutral-200 bg-white shadow-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-supplier-title"
              >
                <div className="flex items-center justify-between border-b border-neutral-100 p-4">
                  <h2 id="create-supplier-title" className="text-lg font-semibold text-neutral-900">
                    Cadastrar fornecedor (sem usuário)
                  </h2>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="Fechar"
                    onClick={() => setIsModalOpen(false)}
                  >
                    ×
                  </Button>
                </div>
                <form
                  onSubmit={handleCreateSupplier}
                  className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2"
                >
                  <div className="space-y-1">
                    <label
                      htmlFor="new-supplier-name"
                      className="text-sm font-medium text-neutral-800"
                    >
                      Nome
                    </label>
                    <Input
                      id="new-supplier-name"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="new-supplier-cnpj"
                      className="text-sm font-medium text-neutral-800"
                    >
                      CNPJ (opcional)
                    </label>
                    <Input
                      id="new-supplier-cnpj"
                      value={newCnpj}
                      onChange={e => setNewCnpj(formatCnpj(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label
                      htmlFor="new-supplier-specialty"
                      className="text-sm font-medium text-neutral-800"
                    >
                      Especialidade (opcional)
                    </label>
                    <Input
                      id="new-supplier-specialty"
                      value={newSpecialty}
                      onChange={e => setNewSpecialty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label
                      htmlFor="new-supplier-phone"
                      className="text-sm font-medium text-neutral-800"
                    >
                      Telefone (opcional)
                    </label>
                    <Input
                      id="new-supplier-phone"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Button type="submit" disabled={isFormDisabled}>
                        {submitting ? 'Cadastrando...' : 'Cadastrar fornecedor'}
                      </Button>
                      <p className="text-xs text-neutral-500">
                        O fornecedor será criado com status &quot;pendente&quot; e não poderá ter o
                        status alterado até que um usuário se registre.
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
