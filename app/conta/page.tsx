'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
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
      childrenCount: (user?.childrenCount as number | undefined) ?? undefined,
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
  const childrenCountIsEmpty =
    (user?.childrenCount as number | undefined) == null || (user?.childrenCount as number) <= 0;
  const [cepError, setCepError] = useState<string | null>(null);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [hasAutoAddress, setHasAutoAddress] = useState(false);

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

  // CEP helpers (same behavior as cadastro)
  const digitsOnly = (value: string) => value.replace(/\D/g, '');
  const formatCpf = (digits: string) => {
    const d = digits.slice(0, 11);
    const first = d.slice(0, 3);
    const second = d.slice(3, 6);
    const third = d.slice(6, 9);
    const last = d.slice(9, 11);
    if (d.length <= 3) return first;
    if (d.length <= 6) return `${first}.${second}`;
    if (d.length <= 9) return `${first}.${second}.${third}`;
    return `${first}.${second}.${third}-${last}`;
  };
  const isCpfDigitsValid = (digits: string) => {
    const d = digitsOnly(digits);
    if (d.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(d)) return false;
    const calc = (slice: number) => {
      const sum = d
        .slice(0, slice)
        .split('')
        .reduce((acc, digit, index) => acc + parseInt(digit, 10) * (slice + 1 - index), 0);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    const c1 = calc(9);
    const c2 = calc(10);
    return c1 === Number(d[9]) && c2 === Number(d[10]);
  };
  const formatCep = (digits: string) =>
    digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5, 8)}` : digits;
  const isCepDigitsValid = (digits: string) => digits.length === 8;

  const resetAddressFields = useCallback(() => {
    setForm(prev => ({
      ...prev,
      address: {
        ...prev.address,
        street: '',
        district: '',
        city: '',
        state: '',
      },
    }));
    setHasAutoAddress(false);
  }, []);

  const handleCepChange = (rawValue: string) => {
    const digits = digitsOnly(rawValue).slice(0, 8);
    const formatted = formatCep(digits);
    handleChange('address.cep', formatted);

    if (!digits) {
      setCepError(null);
      resetAddressFields();
      return;
    }

    if (!isCepDigitsValid(digits)) {
      setCepError('CEP deve ter 8 dígitos.');
      resetAddressFields();
      return;
    }

    setCepError(null);
  };

  const handleCepLookup = useCallback(async () => {
    const digits = digitsOnly(form.address.cep);
    if (!digits) {
      setCepError(null);
      resetAddressFields();
      return;
    }
    if (!isCepDigitsValid(digits)) {
      setCepError('Informe um CEP válido com 8 dígitos.');
      resetAddressFields();
      return;
    }

    try {
      setIsFetchingCep(true);
      setCepError(null);
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) {
        throw new Error('Não foi possível buscar o CEP.');
      }
      const data: {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      } = await response.json();
      if (data.erro) {
        throw new Error('CEP não encontrado.');
      }

      handleChange('address.cep', formatCep(digits));
      setForm(prev => ({
        ...prev,
        address: {
          ...prev.address,
          street: data.logradouro ?? '',
          district: data.bairro ?? '',
          city: data.localidade ?? '',
          state: data.uf ?? '',
        },
      }));
      setHasAutoAddress(true);
    } catch (lookupError) {
      const message = lookupError instanceof Error ? lookupError.message : 'Falha ao buscar o CEP.';
      setCepError(message);
      resetAddressFields();
    } finally {
      setIsFetchingCep(false);
    }
  }, [form.address.cep, resetAddressFields]);

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
          // permitir envio de childrenCount somente se ainda estiver vazio no servidor
          childrenCount: childrenCountIsEmpty
            ? typeof form.childrenCount === 'number'
              ? form.childrenCount
              : Number.isFinite(Number(form.childrenCount))
                ? Number(form.childrenCount)
                : undefined
            : undefined,
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
              <label htmlFor="children-count" className="text-sm font-medium">
                Quantidade de filhos {childrenCountIsEmpty ? '' : '(não editável)'}
              </label>
              {childrenCountIsEmpty ? (
                <Input
                  id="children-count"
                  type="number"
                  min={0}
                  step={1}
                  value={String(form.childrenCount ?? '')}
                  onChange={e => {
                    const val = e.target.value;
                    setForm(prev => ({
                      ...prev,
                      childrenCount: val === '' ? undefined : Number(val),
                    }));
                  }}
                  placeholder="0"
                  required
                  inputMode="numeric"
                />
              ) : (
                <Input
                  id="children-count"
                  value={String((form.childrenCount ?? 0) < 0 ? 0 : (form.childrenCount ?? 0))}
                  readOnly
                  disabled
                />
              )}
              {childrenCountIsEmpty && (
                <p className="text-xs text-text-muted">
                  Atenção: após salvar, a quantidade de filhos não poderá ser alterada.
                </p>
              )}
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
                    value={formatCpf(form.cpf)}
                    onChange={e => {
                      const digits = digitsOnly(e.target.value).slice(0, 11);
                      handleChange('cpf', digits);
                      if (!digits) {
                        setCpfError(null);
                      } else if (digits.length < 11) {
                        setCpfError('Digite os 11 dígitos do CPF.');
                      } else {
                        setCpfError(isCpfDigitsValid(digits) ? null : 'CPF inválido.');
                      }
                    }}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    maxLength={14}
                    required
                  />
                  {cpfError && <p className="text-xs text-danger">{cpfError}</p>}
                  <p className="text-xs text-text-muted">
                    Atenção: após salvar, o CPF não poderá ser alterado.
                  </p>
                </>
              ) : (
                <Input id="cpf" value={formatCpf(form.cpf)} readOnly disabled />
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="cep" className="text-sm font-medium">
                CEP
              </label>
              <Input
                id="cep"
                placeholder="00000-000"
                value={form.address.cep}
                onChange={e => handleCepChange(e.target.value)}
                onBlur={handleCepLookup}
                inputMode="numeric"
                maxLength={9}
              />
              <p className="text-xs text-text-muted">
                {isFetchingCep
                  ? 'Buscando CEP...'
                  : hasAutoAddress
                    ? 'Endereço preenchido automaticamente pelo CEP.'
                    : 'Informe o CEP para carregar o endereço automaticamente.'}
              </p>
              {cepError && <p className="text-xs text-danger">{cepError}</p>}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label htmlFor="street" className="text-sm font-medium">
                Rua
              </label>
              <Input
                id="street"
                value={form.address.street}
                readOnly
                aria-readonly="true"
                title="Campo preenchido automaticamente a partir do CEP"
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
                readOnly
                aria-readonly="true"
                title="Campo preenchido automaticamente a partir do CEP"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="city" className="text-sm font-medium">
                Cidade
              </label>
              <Input
                id="city"
                value={form.address.city}
                readOnly
                aria-readonly="true"
                title="Campo preenchido automaticamente a partir do CEP"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="state" className="text-sm font-medium">
                Estado
              </label>
              <Input
                id="state"
                value={form.address.state}
                readOnly
                aria-readonly="true"
                title="Campo preenchido automaticamente a partir do CEP"
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={saving || !user || Boolean(cpfError)}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
