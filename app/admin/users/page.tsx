'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import AdminGuard from '@/app/admin/AdminGuard';
import { Alert } from '@/app/components/ui/Alert';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import useAuth from '@/src/hooks/useAuth';

type AdminUser = {
  id: string;
  name?: string;
  email?: string;
  role?: 'user' | 'admin';
  provider?: 'credentials' | 'google' | string;
  verified?: boolean;
  createdAt?: string;
};

const roleTone: Record<'user' | 'admin', 'neutral' | 'accent'> = {
  user: 'neutral',
  admin: 'accent',
};

type MutationState = {
  id: string;
  type: 'promote' | 'block';
};

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch (error) {
    console.error('Failed to parse JSON', error);
    return {};
  }
}

export default function AdminUsersPage() {
  const { accessToken, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutation, setMutation] = useState<MutationState | null>(null);

  const canInteract = Boolean(accessToken) && !authLoading;

  const fetchUsers = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      });
      const payload = (await readJson(response)) as { data?: AdminUser[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Não foi possível carregar os usuários.');
      }

      setUsers(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro inesperado ao carregar os usuários.';
      setError(message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    fetchUsers();
  }, [accessToken, fetchUsers]);

  const handleRoleChange = useCallback(
    async (userId: string, nextRole: 'user' | 'admin', type: MutationState['type']) => {
      if (!accessToken) return;

      setMutation({ id: userId, type });
      setError(null);

      try {
        const response = await fetch(`/api/admin/users/${userId}/role`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ role: nextRole }),
        });
        const payload = (await readJson(response)) as { data?: Partial<AdminUser>; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? 'Não foi possível atualizar o usuário.');
        }

        setUsers(prev =>
          prev.map(user =>
            user.id === userId
              ? {
                  ...user,
                  ...(typeof payload.data === 'object' && payload.data ? payload.data : {}),
                  role: nextRole,
                }
              : user,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro inesperado ao atualizar o usuário.';
        setError(message);
      } finally {
        setMutation(null);
      }
    },
    [accessToken],
  );

  const handlePromote = useCallback(
    (userId: string) => handleRoleChange(userId, 'admin', 'promote'),
    [handleRoleChange],
  );

  const handleBlock = useCallback(
    (user: AdminUser) => {
      const confirmationLabel = user.name ?? user.email ?? 'este usuário';
      const confirmed = window.confirm(`Bloquear ${confirmationLabel}?`);
      if (!confirmed) return;

      handleRoleChange(user.id, 'user', 'block');
    },
    [handleRoleChange],
  );

  const roleSummary = useMemo(() => {
    const total = users.length;
    const admins = users.filter(user => user.role === 'admin').length;
    return { total, admins };
  }, [users]);

  const isLoadingTable = loading || authLoading || !canInteract;

  return (
    <AdminGuard requiredRole="admin">
      <div className="space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Usuários</p>
            <h1 className="text-3xl font-semibold text-neutral-900">Gestão de acesso</h1>
            <p className="text-sm text-neutral-500">
              {roleSummary.admins} administradores ativos de {roleSummary.total} contas cadastradas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => fetchUsers()}
              disabled={!canInteract || loading}
            >
              Atualizar lista
            </Button>
          </div>
        </header>

        {error && <Alert tone="danger" description={error} />}

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-neutral-100 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Provedor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {isLoadingTable && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-neutral-500">
                    {authLoading || !accessToken
                      ? 'Aguardando autenticação...'
                      : 'Carregando usuários...'}
                  </td>
                </tr>
              )}

              {!isLoadingTable && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-neutral-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}

              {!isLoadingTable &&
                users.map(user => {
                  const isMutating = mutation?.id === user.id;
                  const isPromoting = isMutating && mutation?.type === 'promote';
                  const isBlocking = isMutating && mutation?.type === 'block';
                  const role: 'user' | 'admin' = user.role === 'admin' ? 'admin' : 'user';
                  const providerLabel = user.provider === 'google' ? 'Google' : 'Credenciais';
                  const providerTone = user.provider === 'google' ? 'accent' : 'neutral';

                  return (
                    <tr key={user.id} className="hover:bg-brand-50/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-neutral-900">
                          {user.name ?? user.email ?? 'Usuário sem nome'}
                        </div>
                        <p className="text-xs text-neutral-500">{user.email ?? 'sem-email'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={roleTone[role]}>{role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={providerTone}>{providerLabel}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={user.verified ? 'success' : 'warning'}>
                          {user.verified ? 'Verificado' : 'Pendente'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handlePromote(user.id)}
                            disabled={role === 'admin' || isMutating || !canInteract}
                          >
                            {isPromoting ? 'Promovendo...' : 'Promover admin'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleBlock(user)}
                            disabled={isMutating || !canInteract}
                          >
                            {isBlocking ? 'Bloqueando...' : 'Bloquear'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
