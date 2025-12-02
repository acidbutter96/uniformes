'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import useAuth from '@/src/hooks/useAuth';

export default function AccountPage() {
  const { user, accessToken, loading, loadUser } = useAuth();
  const router = useRouter();

  const initial = useMemo(
    () => ({
      name: (user?.name as string) || '',
      email: (user?.email as string) || '',
      cpf: (user?.cpf as string) || '',
      address: {
        cep: (user?.address?.cep as string) || '',
        street: (user?.address?.street as string) || '',
        number: (user?.address?.number as string) || '',
        complement: (user?.address?.complement as string) || '',
        district: (user?.address?.district as string) || '',
        city: (user?.address?.city as string) || '',
        state: (user?.address?.state as string) || '',
      },
    }),
    [user],
  );

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const cpfIsEmpty = !((user?.cpf as string) || '').trim();

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const handleChange = (
    field: 'name' | 'email' | 'cpf' | `address.${keyof typeof form.address}`,
    value: string,
  ) => {
    if (field.startsWith('address.')) {
      const aKey = field.split('.')[1] as keyof typeof form.address;
      setForm(prev => ({ ...prev, address: { ...prev.address, [aKey]: value } }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          address: form.address,
          // permitir envio de cpf somente se ainda estiver vazio no servidor
          cpf: cpfIsEmpty ? form.cpf : undefined,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(payload?.error ?? 'Não foi possível salvar suas informações.');
        return;
      }

      setSuccess('Informações atualizadas com sucesso.');
      await loadUser();
    } catch (err) {
      console.error('Failed to update profile', err);
      setError('Erro inesperado ao salvar suas informações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-lg px-md py-2xl">
        <header className="space-y-1">
          <h1 className="text-h3 font-heading">Minha conta</h1>
          <p className="text-body text-text-muted">Atualize seus dados cadastrais.</p>
        </header>

        <Card className="space-y-md p-6">
          {error && <Alert tone="danger" description={error} />}
          {success && <Alert tone="success" description={success} />}

          <form onSubmit={handleSubmit} className="grid gap-md md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">
                Nome completo
              </label>
              <Input
                id="name"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="cpf" className="text-sm font-medium">
                CPF {cpfIsEmpty ? '' : '(não editável)'}
              </label>
              {cpfIsEmpty ? (
                <>
                  <Input
                    id="cpf"
                    value={form.cpf}
                    onChange={e => handleChange('cpf', e.target.value.replace(/\D/g, ''))}
                    placeholder="Somente números (11 dígitos)"
                    inputMode="numeric"
                    maxLength={11}
                    required
                  />
                  <p className="text-xs text-text-muted">
                    Atenção: após salvar, o CPF não poderá ser alterado.
                  </p>
                </>
              ) : (
                <Input id="cpf" value={form.cpf} readOnly disabled />
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="cep" className="text-sm font-medium">
                CEP
              </label>
              <Input
                id="cep"
                value={form.address.cep}
                onChange={e => handleChange('address.cep', e.target.value)}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label htmlFor="street" className="text-sm font-medium">
                Rua
              </label>
              <Input
                id="street"
                value={form.address.street}
                onChange={e => handleChange('address.street', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="number" className="text-sm font-medium">
                Número
              </label>
              <Input
                id="number"
                value={form.address.number}
                onChange={e => handleChange('address.number', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="complement" className="text-sm font-medium">
                Complemento
              </label>
              <Input
                id="complement"
                value={form.address.complement}
                onChange={e => handleChange('address.complement', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="district" className="text-sm font-medium">
                Bairro
              </label>
              <Input
                id="district"
                value={form.address.district}
                onChange={e => handleChange('address.district', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="city" className="text-sm font-medium">
                Cidade
              </label>
              <Input
                id="city"
                value={form.address.city}
                onChange={e => handleChange('address.city', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="state" className="text-sm font-medium">
                Estado
              </label>
              <Input
                id="state"
                value={form.address.state}
                onChange={e => handleChange('address.state', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={saving || !user}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
