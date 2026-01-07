'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import useAuth from '@/src/hooks/useAuth';
import type { AuthUser } from '@/src/context/AuthContext';

export default function AccountPage() {
  const { user, accessToken, loading, loadUser } = useAuth();
  const router = useRouter();
  const isSupplier = (user?.role as string) === 'supplier';

  type AddressKey = 'cep' | 'street' | 'number' | 'complement' | 'district' | 'city' | 'state';

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
  const [cepError, setCepError] = useState<string | null>(null);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [hasAutoAddress, setHasAutoAddress] = useState(false);
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [childrenState, setChildrenState] = useState<
    Array<{ id?: string; name: string; age: number; schoolId?: string }>
  >([]);
  const [supplierSchoolIds, setSupplierSchoolIds] = useState<string[]>([]);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [savingSchools, setSavingSchools] = useState(false);
  const [showNewChildrenModal, setShowNewChildrenModal] = useState(false);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Load schools list and supplier's linked schools when supplier
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const res = await fetch('/api/schools');
        const payload = (await res.json().catch(() => ({}))) as {
          data?: Array<{ id: string; name: string }>;
        };
        setSchools(payload?.data ?? []);
      } catch (err) {
        console.error('Failed to load schools', err);
      }
    };

    const loadSupplierSchools = async () => {
      if (!accessToken) return;
      try {
        const res = await fetch('/api/suppliers/me/schools', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const payload = (await res.json().catch(() => ({}))) as { data?: { schoolIds?: string[] } };
        setSupplierSchoolIds(payload?.data?.schoolIds ?? []);
      } catch (err) {
        console.error('Failed to load supplier schools', err);
      }
    };

    loadSchools();
    if (isSupplier) loadSupplierSchools();
  }, [isSupplier, accessToken]);

  // Load current user's children into local state
  useEffect(() => {
    if (!user) return;
    const raw = Array.isArray(user?.children)
      ? (user.children as NonNullable<AuthUser['children']>)
      : [];
    const parsed = raw
      .map(c => ({
        id: c._id ? String(c._id) : undefined,
        name: String(c.name ?? ''),
        age: Number(c.age ?? 0),
        schoolId: String(c.schoolId ?? ''),
      }))
      .filter(c => c.name && Number.isFinite(c.age) && c.age >= 0);
    setChildrenState(parsed);
  }, [user]);

  const handleChange = useCallback(
    (field: 'name' | 'email' | 'cpf' | `address.${AddressKey}`, value: string) => {
      if (field.startsWith('address.')) {
        const aKey = field.split('.')[1] as AddressKey;
        setForm(prev => ({ ...prev, address: { ...prev.address, [aKey]: value } }));
      } else {
        setForm(prev => ({ ...prev, [field]: value }));
      }
    },
    [],
  );

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

  // Check CPF uniqueness on input (requires auth)
  const checkCpfUnique = useCallback(
    async (digits: string) => {
      if (!accessToken) return;
      const sanitized = digitsOnly(digits);
      if (sanitized.length !== 11) return;
      try {
        const res = await fetch('/api/auth/check-cpf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ cpf: sanitized }),
        });
        const payload = (await res.json().catch(() => ({}))) as {
          data?: { exists?: boolean };
          error?: string;
        };
        const exists = Boolean(payload?.data?.exists);
        if (exists) {
          setCpfError('CPF já cadastrado.');
        } else {
          setCpfError(null);
        }
      } catch (err) {
        console.error('Failed to check cpf uniqueness', err);
      }
    },
    [accessToken],
  );

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
  }, [form.address.cep, handleChange, resetAddressFields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await attemptSave();
  };

  const saveProfile = async () => {
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
          // include only valid children
          children: childrenState
            .filter(c => c.name?.trim() && Number.isFinite(c.age) && c.age >= 0 && c.schoolId)
            .map(c => ({ name: c.name.trim(), age: c.age, schoolId: c.schoolId })),
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

  const attemptSave = async () => {
    // if there are new children (without id) ask for confirmation
    const hasNew = childrenState.some(c => !c.id && c.name?.trim() && Number.isFinite(c.age));
    if (hasNew) {
      setShowNewChildrenModal(true);
      return;
    }
    await saveProfile();
  };

  const handleChildChange = (index: number, field: 'name' | 'age' | 'schoolId', value: string) => {
    setChildrenState(prev => {
      const next = [...prev];
      const current = { ...(next[index] ?? { name: '', age: 0, schoolId: '' }) };
      if (field === 'age') {
        current.age = Number(value || 0);
      } else if (field === 'name') {
        current.name = value;
      } else {
        current.schoolId = value;
      }
      next[index] = current;
      return next;
    });
  };

  const addChild = () => {
    setChildrenState(prev => [...prev, { name: '', age: 0, schoolId: '' }]);
  };

  const removeChild = (index: number) => {
    setChildrenState(prev => prev.filter((_, i) => i !== index));
  };

  const filteredSchools = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(s => s.name.toLowerCase().includes(q));
  }, [schoolQuery, schools]);

  const toggleSchool = (id: string) => {
    setSupplierSchoolIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const saveSupplierSchools = async () => {
    if (!accessToken) return;
    setSavingSchools(true);
    setSchoolError(null);
    try {
      const res = await fetch('/api/suppliers/me/schools', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ schoolIds: supplierSchoolIds }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSchoolError(payload?.error ?? 'Não foi possível salvar escolas atendidas.');
        return;
      }
      setSuccess('Escolas atendidas atualizadas com sucesso.');
    } catch (err) {
      console.error('Failed to update supplier schools', err);
      setSchoolError('Erro inesperado ao salvar escolas atendidas.');
    } finally {
      setSavingSchools(false);
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

          {/* Supplier header (read-only) */}
          {isSupplier && (
            <div className="grid gap-md md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Fornecedor</label>
                {/* prettier-ignore */}
                <Input
                  value={
                    (
                      ((user as unknown as { supplier?: { name?: string } })?.supplier?.name as string) ??
                      (user?.name as string) ??
                      ''
                    )
                  }
                  readOnly
                  disabled
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CNPJ</label>
                {/* prettier-ignore */}
                <Input
                  value={
                    (
                      ((user as unknown as { supplier?: { cnpj?: string } })?.supplier?.cnpj as string) ??
                      ''
                    )
                  }
                  readOnly
                  disabled
                />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-md md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">
                Nome completo (somente leitura)
              </label>
              <Input id="name" value={form.name} readOnly disabled />
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
                        const valid = isCpfDigitsValid(digits);
                        setCpfError(valid ? null : 'CPF inválido.');
                        if (valid) checkCpfUnique(digits);
                      }
                    }}
                    placeholder="000.000.000-00"
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

            {/* submit removed from here; final save button is at page end */}
            <div className="md:col-span-2" />
          </form>

          {/* Children (alunos) editor for account owners */}
          <div className="space-y-md">
            <label className="text-sm font-medium">Alunos vinculados</label>
            <div className="space-y-3">
              {childrenState.length === 0 && (
                <p className="text-sm text-text-muted">Nenhum aluno cadastrado na sua conta.</p>
              )}
              <div className="flex flex-col gap-2">
                {childrenState.map((child, idx) => (
                  <div
                    key={child.id ?? idx}
                    className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface px-md py-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-body font-semibold truncate">
                            {child.name || '—'}
                          </div>
                          <div className="text-caption text-text-muted">{child.age} anos</div>
                        </div>
                        <div className="text-sm text-text-muted truncate w-40 text-right">
                          {schools.find(s => s.id === child.schoolId)?.name ??
                            'Escola não selecionada'}
                        </div>
                      </div>
                      {/* Inline editable fields */}
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                        {child.id ? (
                          <>
                            <Input
                              placeholder="Nome do aluno"
                              value={child.name}
                              readOnly
                              disabled
                            />
                            <Input
                              type="number"
                              placeholder="Idade"
                              value={String(child.age ?? 0)}
                              readOnly
                              disabled
                            />
                            <select
                              className="w-full rounded-card border border-border bg-surface px-md py-sm text-body text-text shadow-sm"
                              value={child.schoolId ?? ''}
                              disabled
                            >
                              <option value="">
                                {schools.find(s => s.id === child.schoolId)?.name ?? 'Escola'}
                              </option>
                            </select>
                          </>
                        ) : (
                          <>
                            <Input
                              placeholder="Nome do aluno"
                              value={child.name}
                              onChange={e => handleChildChange(idx, 'name', e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Idade"
                              value={String(child.age ?? 0)}
                              onChange={e => handleChildChange(idx, 'age', e.target.value)}
                              min={0}
                            />
                            <select
                              className="w-full rounded-card border border-border bg-surface px-md py-sm text-body text-text shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              value={child.schoolId ?? ''}
                              onChange={e => handleChildChange(idx, 'schoolId', e.target.value)}
                            >
                              <option value="">Selecione a escola</option>
                              {schools.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!child.id && (
                        <button
                          type="button"
                          aria-label={`Remover aluno ${child.name || ''}`}
                          onClick={() => removeChild(idx)}
                          className="flex h-10 w-10 items-center justify-center rounded-card border border-border bg-surface text-text-muted shadow-soft transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="h-5 w-5 text-danger"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <button
                  type="button"
                  aria-label="Adicionar aluno"
                  onClick={addChild}
                  className="flex h-10 w-10 items-center justify-center rounded-card border border-border bg-surface text-text-muted shadow-soft transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {showNewChildrenModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40"
                aria-hidden="true"
                onClick={() => setShowNewChildrenModal(false)}
              />
              <div
                className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-children-warning-title"
              >
                <h2 id="new-children-warning-title" className="text-lg font-semibold">
                  Atenção — alunos adicionados não poderão ser editados
                </h2>
                <p className="mt-3 text-sm text-text-muted">
                  Ao salvar, os alunos recém-adicionados serão vinculados permanentemente ao seu
                  cadastro e não poderão ser editados ou removidos através da interface. Deseja
                  prosseguir?
                </p>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewChildrenModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      setShowNewChildrenModal(false);
                      await saveProfile();
                    }}
                  >
                    Confirmar e salvar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Supplier schools selector */}
          {isSupplier && (
            <div className="space-y-md">
              {schoolError && <Alert tone="danger" description={schoolError} />}
              <div className="space-y-2">
                <label className="text-sm font-medium">Escolas atendidas</label>
                <Input
                  placeholder="Pesquisar escolas por nome"
                  value={schoolQuery}
                  onChange={e => setSchoolQuery(e.target.value)}
                />
                <div className="max-h-64 overflow-auto border border-border rounded-md">
                  <ul className="divide-y divide-border">
                    {filteredSchools.map(s => (
                      <li key={s.id} className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm">{s.name}</span>
                        <Button
                          size="sm"
                          variant={supplierSchoolIds.includes(s.id) ? 'primary' : 'outline'}
                          onClick={() => toggleSchool(s.id)}
                        >
                          {supplierSchoolIds.includes(s.id) ? 'Selecionada' : 'Selecionar'}
                        </Button>
                      </li>
                    ))}
                    {filteredSchools.length === 0 && (
                      <li className="px-3 py-2 text-sm text-text-muted">
                        Nenhuma escola encontrada.
                      </li>
                    )}
                  </ul>
                </div>
                <div>
                  <Button onClick={saveSupplierSchools} disabled={savingSchools || !accessToken}>
                    {savingSchools ? 'Salvando...' : 'Salvar escolas atendidas'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Final save button placed at the end */}
          <div className="mt-6 flex justify-center">
            <div className="w-full max-w-md flex justify-center">
              <Button
                onClick={attemptSave}
                size="md"
                disabled={saving || !user || Boolean(cpfError)}
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
