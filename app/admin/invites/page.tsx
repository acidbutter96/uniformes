'use client';

import { useState } from 'react';
import AdminGuard from '../AdminGuard';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Alert } from '@/app/components/ui/Alert';

const PUBLIC_URL = process.env.NEXT_PUBLIC_URL ?? '';

export default function SupplierInvitesPage() {
  const [email, setEmail] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [expiresInMinutes, setExpiresInMinutes] = useState(60);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCreateInvite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setInviteLink(null);

    if (!email && !supplierId) {
      setError('Informe pelo menos e-mail ou supplierId.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/suppliers/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || undefined,
          supplierId: supplierId || undefined,
          expiresInMinutes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? 'Não foi possível criar o convite.');
        return;
      }

      const token: string | undefined = data?.token;
      if (!token) {
        setError('Resposta sem token de convite.');
        return;
      }

      const baseUrl = PUBLIC_URL || window.location.origin;
      const link = `${baseUrl}/supplier-register?token=${token}`;
      setInviteLink(link);
      setSuccess('Convite criado com sucesso. Use o link abaixo.');
    } catch (err) {
      console.error('Failed to create supplier invite', err);
      setError('Erro inesperado ao criar o convite.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setSuccess('Link copiado para a área de transferência.');
    } catch (err) {
      console.error('Failed to copy invite link', err);
      setError('Não foi possível copiar o link.');
    }
  }

  return (
    <AdminGuard
      requiredRole="admin"
      loadingMessage="Validando acesso ao painel de administração..."
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Convites de fornecedores</h1>

        <Card className="flex flex-col gap-4 p-6">
          <p className="text-sm text-neutral-600">
            Gere um link de convite para que um fornecedor realize o próprio cadastro. O link é
            válido apenas por um período limitado definido abaixo.
          </p>

          {error && <Alert tone="danger" description={error} />}
          {success && !error && <Alert tone="success" description={success} />}

          <form onSubmit={handleCreateInvite} className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-neutral-800">
                  E-mail do contato (opcional)
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contato@fornecedor.com"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                />
                <p className="text-xs text-neutral-500">
                  Se informado, use o e-mail principal da pessoa de contato no fornecedor.
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="supplierId" className="text-sm font-medium text-neutral-800">
                  Supplier ID existente (opcional)
                </label>
                <Input
                  id="supplierId"
                  placeholder="Opcional: ID de um fornecedor já cadastrado"
                  value={supplierId}
                  onChange={event => setSupplierId(event.target.value)}
                />
                <p className="text-xs text-neutral-500">
                  Use apenas se o fornecedor já existir na base e o convite for para criar o
                  usuário.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1 md:max-w-xs">
              <label htmlFor="expiresIn" className="text-sm font-medium text-neutral-800">
                Validade do link (minutos)
              </label>
              <Input
                id="expiresIn"
                type="number"
                min={5}
                max={1440}
                value={expiresInMinutes}
                onChange={event => setExpiresInMinutes(Number(event.target.value) || 0)}
              />
              <p className="text-xs text-neutral-500">
                Padrão: 60 minutos. Após esse período, o link expira automaticamente.
              </p>
            </div>

            <div className="mt-2 flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Gerando convite...' : 'Gerar convite'}
              </Button>

              {inviteLink && (
                <Button type="button" onClick={handleCopyLink}>
                  Copiar link
                </Button>
              )}
            </div>
          </form>

          {inviteLink && (
            <div className="mt-4 flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Link de convite gerado
              </span>
              <code className="break-all rounded-md bg-neutral-50 p-3 text-xs text-neutral-800">
                {inviteLink}
              </code>
            </div>
          )}
        </Card>
      </div>
    </AdminGuard>
  );
}
