'use client';
/* eslint-disable prettier/prettier */

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { PasswordField } from '@/app/components/forms/PasswordField';


const digitsOnly = (value: string) => value.replace(/\D/g, '');

const formatCnpj = (value: string) => {
    const digits = digitsOnly(value).slice(0, 14);
    const part1 = digits.slice(0, 2);
    const part2 = digits.slice(2, 5);
    const part3 = digits.slice(5, 8);
    const part4 = digits.slice(8, 12);
    const part5 = digits.slice(12, 14);

    if (digits.length <= 2) return part1;
    if (digits.length <= 5) return `${part1}.${part2}`;
    if (digits.length <= 8) return `${part1}.${part2}.${part3}`;
    if (digits.length <= 12) return `${part1}.${part2}.${part3}/${part4}`;
    return `${part1}.${part2}.${part3}/${part4}-${part5}`;
};

const formatCpf = (value: string) => {
    const digits = digitsOnly(value).slice(0, 11);
    const first = digits.slice(0, 3);
    const second = digits.slice(3, 6);
    const third = digits.slice(6, 9);
    const last = digits.slice(9, 11);

    if (digits.length <= 3) return first;
    if (digits.length <= 6) return `${first}.${second}`;
    if (digits.length <= 9) return `${first}.${second}.${third}`;
    return `${first}.${second}.${third}-${last}`;
};

const isCpfDigitsValid = (digits: string) => {
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;

    const calcCheckDigit = (slice: number) => {
        const sum = digits
            .slice(0, slice)
            .split('')
            .reduce((acc, digit, index) => acc + parseInt(digit, 10) * (slice + 1 - index), 0);
        const remainder = (sum * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };

    const check1 = calcCheckDigit(9);
    const check2 = calcCheckDigit(10);
    return check1 === Number(digits[9]) && check2 === Number(digits[10]);
};

const formatCep = (digits: string) => {
    const left = digits.slice(0, 5);
    const right = digits.slice(5, 8);
    return right ? `${left}-${right}` : left;
};

const isCepDigitsValid = (digits: string) => digits.length === 8;

export default function SupplierRegisterClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams?.get('token') ?? '';

    const [name, setName] = useState(''); // user full name
    const [supplierName, setSupplierName] = useState('');
    const [supplierLocked, setSupplierLocked] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [cpf, setCpf] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [cep, setCep] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [complement, setComplement] = useState('');
    const [district, setDistrict] = useState('');
    const [city, setCity] = useState('');
    const [stateUf, setStateUf] = useState('');
    const [hasAutoAddress, setHasAutoAddress] = useState(false);
    const [isFetchingCep, setIsFetchingCep] = useState(false);
    const [cepError, setCepError] = useState<string | null>(null);
    const [cpfError, setCpfError] = useState<string | null>(null);
    const [cnpj, setCnpj] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function loadInvite() {
            if (!token) return;
            try {
                const res = await fetch(`/api/suppliers/register-by-token?token=${encodeURIComponent(token)}`);
                const data = await res.json();
                if (!res.ok) {
                    setError(data?.error ?? 'Não foi possível verificar o convite.');
                    return;
                }
                const sId = data?.data?.supplierId ?? data?.supplierId ?? null;
                const sName = data?.data?.supplierName ?? data?.supplierName ?? '';
                if (sId) {
                    setSupplierLocked(true);
                    setSupplierName(sName ?? '');
                } else {
                    setSupplierLocked(false);
                }
            } catch (e) {
                console.error('Failed to load invite metadata', e);
                setError('Não foi possível verificar o convite.');
            }
        }
        loadInvite();
    }, [token]);

    const handleCpfChange = (rawValue: string) => {
        const digits = digitsOnly(rawValue).slice(0, 11);
        setCpf(formatCpf(digits));

        if (!digits) {
            setCpfError(null);
            return;
        }

        if (digits.length < 11) {
            setCpfError('Digite os 11 dígitos do CPF.');
            return;
        }

        const valid = isCpfDigitsValid(digits);
        setCpfError(valid ? null : 'CPF inválido.');
    };

    const resetAddressFields = useCallback(() => {
        setStreet('');
        setDistrict('');
        setCity('');
        setStateUf('');
        setHasAutoAddress(false);
    }, []);

    const handleCepChange = (rawValue: string) => {
        const digits = digitsOnly(rawValue).slice(0, 8);
        setCep(formatCep(digits));

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
        resetAddressFields();
    };

    const handleCepLookup = useCallback(async () => {
        const digits = digitsOnly(cep);
        if (digits.length === 0) {
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

            setCep(formatCep(digits));
            setStreet(data.logradouro ?? '');
            setDistrict(data.bairro ?? '');
            setCity(data.localidade ?? '');
            setStateUf(data.uf ?? '');
            setHasAutoAddress(true);
        } catch (lookupError) {
            const message = lookupError instanceof Error ? lookupError.message : 'Falha ao buscar o CEP.';
            setCepError(message);
            resetAddressFields();
        } finally {
            setIsFetchingCep(false);
        }
    }, [cep, resetAddressFields]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (!token) {
            setError('Link de convite inválido: token ausente.');
            return;
        }

        // Basic validations mirroring user registration
        if (password.length < 6) {
            setError('A senha precisa ter ao menos 6 caracteres.');
            return;
        }
        if (!confirmPassword) {
            setError('Repita a senha.');
            return;
        }
        if (confirmPassword !== password) {
            setError('As senhas não coincidem.');
            return;
        }

        const cpfDigits = digitsOnly(cpf);
        if (!isCpfDigitsValid(cpfDigits)) {
            setError('Informe um CPF válido.');
            return;
        }

        const cepDigits = digitsOnly(cep);
        if (!isCepDigitsValid(cepDigits)) {
            setError('Informe um CEP válido com 8 dígitos.');
            return;
        }
        if (!street || !district || !city || !stateUf) {
            setError('Preencha o CEP para carregar o endereço.');
            return;
        }

        if (!number.trim()) {
            setError('Informe o número do endereço.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/suppliers/register-by-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    name, // user full name
                    supplierName,
                    email,
                    password,
                    cpf: digitsOnly(cpf),
                    birthDate,
                    address: {
                        cep: digitsOnly(cep),
                        street,
                        number,
                        complement,
                        district,
                        city,
                        state: stateUf,
                    },
                    cnpj: digitsOnly(cnpj),
                    specialty,
                    phone,
                }),
            });

            const payload = (await response.json().catch(() => ({}))) as { error?: string };

            if (!response.ok) {
                setError(payload.error ?? 'Não foi possível concluir o cadastro.');
                return;
            }

            setSuccess('Cadastro realizado com sucesso! Você já pode acessar o painel como fornecedor.');
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err) {
            console.error('Failed to submit supplier registration', err);
            setError('Não foi possível concluir o cadastro.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-background text-text">
            <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-md py-2xl lg:max-w-4xl">
                <Card className="space-y-6 p-6">
                    <header className="space-y-2 text-center">
                        <h1 className="text-2xl font-semibold text-text">Cadastro de fornecedor</h1>
                        <p className="text-sm text-text-muted">
                            Preencha os dados da sua empresa para acessar o painel da Uniforma.
                        </p>
                    </header>

                    {!token && <Alert tone="danger" description="Link de convite inválido ou incompleto." />}

                    {error && <Alert tone="danger" description={error} />}
                    {success && <Alert tone="success" description={success} />}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-1">
                                <label htmlFor="supplier-name" className="text-sm font-medium text-text">
                                    Nome completo
                                </label>
                                <Input
                                    id="supplier-name"
                                    placeholder="Maria Oliveira"
                                    value={name}
                                    onChange={event => setName(event.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="supplier-email" className="text-sm font-medium text-text">
                                    Email
                                </label>
                                <Input
                                    id="supplier-email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="voce@fornecedor.com"
                                    value={email}
                                    onChange={event => setEmail(event.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <PasswordField
                                    id="supplier-password"
                                    label="Senha"
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    value={password}
                                    minLength={6}
                                    onChange={event => setPassword(event.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <PasswordField
                                    id="supplier-confirm-password"
                                    label="Repita a senha"
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    minLength={6}
                                    onChange={event => setConfirmPassword(event.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="supplier-cpf" className="text-sm font-medium text-text">
                                    CPF do responsável
                                </label>
                                <Input
                                    id="supplier-cpf"
                                    placeholder="000.000.000-00"
                                    value={cpf}
                                    onChange={event => handleCpfChange(event.target.value)}
                                    inputMode="numeric"
                                    maxLength={14}
                                    required
                                />
                                {cpfError && <p className="text-xs text-danger">{cpfError}</p>}
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="supplier-birthdate" className="text-sm font-medium text-text">
                                    Data de nascimento
                                </label>
                                <Input
                                    id="supplier-birthdate"
                                    type="date"
                                    value={birthDate}
                                    onChange={event => setBirthDate(event.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="space-y-1 lg:col-span-3">
                                <label htmlFor="supplier-cep" className="text-sm font-medium text-text">
                                    CEP
                                </label>
                                <Input
                                    id="supplier-cep"
                                    placeholder="00000-000"
                                    value={cep}
                                    onChange={event => handleCepChange(event.target.value)}
                                    onBlur={handleCepLookup}
                                    inputMode="numeric"
                                    maxLength={9}
                                    required
                                />
                                {cepError && <p className="text-xs text-danger">{cepError}</p>}
                            </div>

                            <div className="space-y-1 lg:col-span-9">
                                <label htmlFor="supplier-street" className="text-sm font-medium text-text">
                                    Rua / Logradouro
                                </label>
                                <Input
                                    id="supplier-street"
                                    placeholder="Avenida Paulista"
                                    value={street}
                                    required
                                    readOnly
                                    aria-readonly="true"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="space-y-1 lg:col-span-4">
                                <label htmlFor="supplier-district" className="text-sm font-medium text-text">
                                    Bairro
                                </label>
                                <Input id="supplier-district" value={district} required readOnly aria-readonly="true" />
                            </div>
                            <div className="space-y-1 lg:col-span-6">
                                <label htmlFor="supplier-city" className="text-sm font-medium text-text">
                                    Cidade
                                </label>
                                <Input id="supplier-city" value={city} required readOnly aria-readonly="true" />
                            </div>
                            <div className="space-y-1 lg:col-span-2">
                                <label htmlFor="supplier-state" className="text-sm font-medium text-text">
                                    Estado (UF)
                                </label>
                                <Input id="supplier-state" value={stateUf} required readOnly aria-readonly="true" maxLength={2} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="space-y-1 lg:col-span-3">
                                <label htmlFor="supplier-number" className="text-sm font-medium text-text">
                                    Número
                                </label>
                                <Input
                                    id="supplier-number"
                                    placeholder="123"
                                    value={number}
                                    onChange={event => setNumber(event.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1 lg:col-span-5">
                                <label htmlFor="supplier-complement" className="text-sm font-medium text-text">
                                    Complemento
                                </label>
                                <Input
                                    id="supplier-complement"
                                    placeholder="Apartamento, bloco..."
                                    value={complement}
                                    onChange={event => setComplement(event.target.value)}
                                />
                            </div>
                            <div className="space-y-1 lg:col-span-4 hidden lg:block"></div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-text-muted">
                            <p>
                                {isFetchingCep
                                    ? 'Buscando CEP...'
                                    : hasAutoAddress
                                        ? 'Endereço preenchido automaticamente pelo CEP.'
                                        : 'Informe o CEP para carregar o endereço automaticamente.'}
                            </p>
                            {!hasAutoAddress && !isFetchingCep && (
                                <span className="font-semibold text-danger">CEP ainda não aplicado</span>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="company-name" className="text-sm font-medium text-text">
                                Nome do fornecedor
                            </label>
                            <Input
                                id="company-name"
                                placeholder={supplierLocked ? '' : 'Ex: Malharia Silva Ltda.'}
                                value={supplierName}
                                onChange={event => setSupplierName(event.target.value)}
                                required={!supplierLocked}
                                readOnly={supplierLocked}
                                aria-readonly={supplierLocked}
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="supplier-cnpj" className="text-sm font-medium text-text">
                                CNPJ
                            </label>
                            <Input
                                id="supplier-cnpj"
                                value={cnpj}
                                onChange={event => setCnpj(formatCnpj(event.target.value))}
                                placeholder="00.000.000/0000-00"
                                inputMode="numeric"
                                maxLength={18}
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="supplier-specialty" className="text-sm font-medium text-text">
                                Especialidade (opcional)
                            </label>
                            <Input
                                id="supplier-specialty"
                                value={specialty}
                                onChange={event => setSpecialty(event.target.value)}
                                placeholder="Ex: Confecção esportiva, malharia..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="supplier-phone" className="text-sm font-medium text-text">
                                Telefone (opcional)
                            </label>
                            <Input
                                id="supplier-phone"
                                value={phone}
                                onChange={event => setPhone(event.target.value)}
                                placeholder="(00) 00000-0000"
                            />
                        </div>

                        <Button type="submit" fullWidth disabled={loading || !token}>
                            {loading ? 'Enviando...' : 'Concluir cadastro'}
                        </Button>
                    </form>
                </Card>
            </div>
        </main>
    );
}
