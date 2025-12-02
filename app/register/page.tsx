'use client';
/* eslint-disable prettier/prettier */
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useCallback, useState } from 'react';

import { PasswordField } from '@/app/components/forms/PasswordField';
import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import useAuth from '@/src/hooks/useAuth';

const digitsOnly = (value: string) => value.replace(/\D/g, '');

const formatCpf = (digits: string) => {
    const first = digits.slice(0, 3);
    const second = digits.slice(3, 6);
    const third = digits.slice(6, 9);
    const last = digits.slice(9, 11);

    if (digits.length <= 3) return first;
    if (digits.length <= 6) return `${first}.${second}`;
    if (digits.length <= 9) return `${first}.${second}.${third}`;
    return `${first}.${second}.${third}-${last}`;
};

const formatCep = (digits: string) => {
    const left = digits.slice(0, 5);
    const right = digits.slice(5, 8);
    return right ? `${left}-${right}` : left;
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

const isCepDigitsValid = (digits: string) => digits.length === 8;

type RegisterField =
    | 'name'
    | 'email'
    | 'password'
    | 'confirmPassword'
    | 'cpf'
    | 'birthDate'
    | 'cep'
    | 'street'
    | 'district'
    | 'city'
    | 'state'
    | 'number';

type RegisterFieldErrors = Partial<Record<RegisterField, string>>;

export default function RegisterPage() {
    return (
        <Suspense fallback={null}>
            <RegisterView />
        </Suspense>
    );
}

function RegisterView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { register, loading } = useAuth();
    const [name, setName] = useState('');
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
    const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
    const [error, setError] = useState<string | null>(null);

    const returnToParam = searchParams?.get('returnTo') ?? null;

    const resolveDestination = (role?: string | null) => {
        const sanitizedReturnTo = returnToParam && returnToParam.startsWith('/') ? returnToParam : null;
        if (sanitizedReturnTo) {
            return sanitizedReturnTo;
        }

        return role === 'admin' ? '/admin/dashboard' : '/sugestao';
    };

    const setFieldError = useCallback((field: RegisterField, message?: string) => {
        setFieldErrors(prev => {
            if (!message) {
                if (!(field in prev)) return prev;
                const next = { ...prev };
                delete next[field];
                return next;
            }
            return { ...prev, [field]: message };
        });
    }, []);

    const resetAddressFields = useCallback(() => {
        setStreet('');
        setDistrict('');
        setCity('');
        setStateUf('');
        setHasAutoAddress(false);
        setFieldError('street');
        setFieldError('district');
        setFieldError('city');
        setFieldError('state');
    }, [setFieldError]);

    const handleCpfChange = (rawValue: string) => {
        const digits = digitsOnly(rawValue).slice(0, 11);
        setCpf(formatCpf(digits));

        if (!digits) {
            setCpfError(null);
            setFieldError('cpf');
            return;
        }

        if (digits.length < 11) {
            setCpfError('Digite os 11 dígitos do CPF.');
            setFieldError('cpf', 'Digite os 11 dígitos do CPF.');
            return;
        }

        const valid = isCpfDigitsValid(digits);
        setCpfError(valid ? null : 'CPF inválido.');
        setFieldError('cpf', valid ? undefined : 'CPF inválido.');
    };

    const handleCepChange = (rawValue: string) => {
        const digits = digitsOnly(rawValue).slice(0, 8);
        setCep(formatCep(digits));

        if (!digits) {
            setCepError(null);
            setFieldError('cep');
            resetAddressFields();
            return;
        }

        if (!isCepDigitsValid(digits)) {
            setCepError('CEP deve ter 8 dígitos.');
            setFieldError('cep', 'CEP deve ter 8 dígitos.');
            resetAddressFields();
            return;
        }

        setCepError(null);
        setFieldError('cep');
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
            setFieldError('street');
            setFieldError('district');
            setFieldError('city');
            setFieldError('state');
        } catch (lookupError) {
            const message = lookupError instanceof Error ? lookupError.message : 'Falha ao buscar o CEP.';
            setCepError(message);
            resetAddressFields();
        } finally {
            setIsFetchingCep(false);
        }
    }, [cep, resetAddressFields, setFieldError]);

    const validateEmailField = (value: string) => {
        const emailValue = value.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailValue) {
            setFieldError('email', 'Informe um email.');
            return;
        }

        if (!emailPattern.test(emailValue)) {
            setFieldError('email', 'Informe um email válido.');
            return;
        }

        setFieldError('email');
    };

    const validateBirthDateField = (value: string) => {
        const birthDateValue = value.trim();

        if (!birthDateValue) {
            setFieldError('birthDate', 'Informe a data de nascimento.');
            return;
        }

        const birth = new Date(birthDateValue);
        const now = new Date();
        const year1900 = new Date(1900, 0, 1);

        if (Number.isNaN(birth.getTime())) {
            setFieldError('birthDate', 'Data de nascimento inválida.');
            return;
        }

        if (birth > now) {
            setFieldError('birthDate', 'Data de nascimento não pode ser no futuro.');
            return;
        }

        if (birth < year1900) {
            setFieldError('birthDate', 'Data de nascimento muito antiga.');
            return;
        }

        setFieldError('birthDate');
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setFieldErrors({});

        try {
            const nextErrors: RegisterFieldErrors = {};

            if (!name.trim()) {
                nextErrors.name = 'Informe o nome completo.';
            }

            if (!email.trim()) {
                nextErrors.email = 'Informe um email.';
            } else {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(email.trim())) {
                    nextErrors.email = 'Informe um email válido.';
                }
            }

            if (password.length < 6) {
                nextErrors.password = 'A senha precisa ter ao menos 6 caracteres.';
            }

            if (!confirmPassword) {
                nextErrors.confirmPassword = 'Repita a senha.';
            } else if (confirmPassword !== password) {
                nextErrors.confirmPassword = 'As senhas não coincidem.';
            }

            const cpfDigits = digitsOnly(cpf);
            if (!isCpfDigitsValid(cpfDigits)) {
                nextErrors.cpf = 'Informe um CPF válido.';
            }

            if (!birthDate) {
                nextErrors.birthDate = 'Informe a data de nascimento.';
            } else {
                const birth = new Date(birthDate);
                const now = new Date();
                const year1900 = new Date(1900, 0, 1);
                if (Number.isNaN(birth.getTime())) {
                    nextErrors.birthDate = 'Data de nascimento inválida.';
                } else if (birth > now) {
                    nextErrors.birthDate = 'Data de nascimento não pode ser no futuro.';
                } else if (birth < year1900) {
                    nextErrors.birthDate = 'Data de nascimento muito antiga.';
                }
            }

            const cepDigits = digitsOnly(cep);
            if (!isCepDigitsValid(cepDigits)) {
                nextErrors.cep = 'Informe um CEP válido com 8 dígitos.';
            }

            if (!street) nextErrors.street = 'Preencha o CEP para carregar o endereço.';
            if (!district) nextErrors.district = 'Preencha o CEP para carregar o endereço.';
            if (!city) nextErrors.city = 'Preencha o CEP para carregar o endereço.';
            if (!stateUf) nextErrors.state = 'Preencha o CEP para carregar o endereço.';

            if (!number.trim()) {
                nextErrors.number = 'Informe o número do endereço.';
            }

            if (Object.keys(nextErrors).length > 0) {
                setFieldErrors(nextErrors);
                setError('Corrija os campos destacados antes de continuar.');
                return;
            }

            const createdUser = await register({
                name,
                email,
                password,
                cpf: cpfDigits,
                birthDate,
                address: {
                    cep: cepDigits,
                    street,
                    number,
                    complement,
                    district,
                    city,
                    state: stateUf,
                },
            });
            const role = typeof createdUser?.role === 'string' ? createdUser.role : null;
            router.push(resolveDestination(role));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Não foi possível criar a conta.';
            setError(message);
        }
    };

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-md py-2xl lg:max-w-4xl">
                <Card className="rounded-2xl border border-border p-8 shadow-card">
                    <div className="mb-6 space-y-2 text-center">
                        <p className="text-caption font-medium uppercase tracking-wider text-primary">
                            Crie sua conta
                        </p>
                        <h1 className="text-3xl font-semibold text-text">Comece agora</h1>
                        <p className="text-sm text-text-muted">
                            Preencha os dados para acompanhar o processo de uniformes.
                        </p>
                    </div>

                    {error && <Alert tone="danger" description={error} className="mb-4" />}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-1">
                                <label htmlFor="register-name" className="text-sm font-medium text-text">
                                    Nome completo
                                </label>
                                <Input
                                    id="register-name"
                                    placeholder="Maria Oliveira"
                                    value={name}
                                    onChange={event => {
                                        setName(event.target.value);
                                        setFieldError('name');
                                    }}
                                    required
                                    aria-invalid={Boolean(fieldErrors.name)}
                                />
                                {fieldErrors.name && <p className="text-xs text-danger">{fieldErrors.name}</p>}
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="register-email" className="text-sm font-medium text-text">
                                    Email
                                </label>
                                <Input
                                    id="register-email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="voce@escola.com"
                                    value={email}
                                    onChange={event => {
                                        setEmail(event.target.value);
                                    }}
                                    onBlur={event => validateEmailField(event.target.value)}
                                    required
                                    aria-invalid={Boolean(fieldErrors.email)}
                                />
                                {fieldErrors.email && <p className="text-xs text-danger">{fieldErrors.email}</p>}
                            </div>

                            <div>
                                <PasswordField
                                    id="register-password"
                                    label="Senha"
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    value={password}
                                    minLength={6}
                                    onChange={event => {
                                        setPassword(event.target.value);
                                        setFieldError('password');
                                    }}
                                    required
                                    aria-invalid={Boolean(fieldErrors.password)}
                                    errorMessage={fieldErrors.password}
                                />
                            </div>

                            <div>
                                <PasswordField
                                    id="register-confirm-password"
                                    label="Repita a senha"
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    minLength={6}
                                    onChange={event => {
                                        setConfirmPassword(event.target.value);
                                        setFieldError('confirmPassword');
                                    }}
                                    required
                                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                                    errorMessage={fieldErrors.confirmPassword}
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="register-cpf" className="text-sm font-medium text-text">
                                    CPF do responsável
                                </label>
                                <Input
                                    id="register-cpf"
                                    placeholder="000.000.000-00"
                                    value={cpf}
                                    onChange={event => handleCpfChange(event.target.value)}
                                    inputMode="numeric"
                                    pattern="\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11}"
                                    maxLength={14}
                                    aria-invalid={Boolean(cpfError) || Boolean(fieldErrors.cpf)}
                                    required
                                />
                                {cpfError && <p className="text-xs text-danger">{cpfError}</p>}
                                {!cpfError && fieldErrors.cpf && (
                                    <p className="text-xs text-danger">{fieldErrors.cpf}</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="register-birthdate" className="text-sm font-medium text-text">
                                    Data de nascimento
                                </label>
                                <Input
                                    id="register-birthdate"
                                    type="date"
                                    value={birthDate}
                                    onChange={event => {
                                        setBirthDate(event.target.value);
                                    }}
                                    onBlur={event => validateBirthDateField(event.target.value)}
                                    required
                                    aria-invalid={Boolean(fieldErrors.birthDate)}
                                />
                                {fieldErrors.birthDate && (
                                    <p className="text-xs text-danger">{fieldErrors.birthDate}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="space-y-1 lg:col-span-3">
                                <label htmlFor="register-cep" className="text-sm font-medium text-text">
                                    CEP
                                </label>
                                <Input
                                    id="register-cep"
                                    placeholder="00000-000"
                                    value={cep}
                                    onChange={event => handleCepChange(event.target.value)}
                                    onBlur={handleCepLookup}
                                    inputMode="numeric"
                                    maxLength={9}
                                    required
                                    aria-invalid={Boolean(cepError) || Boolean(fieldErrors.cep)}
                                />
                                <p className="text-xs font-medium text-primary">
                                    CEP obrigatório: sem ele não é possível preencher o endereço.
                                </p>
                                {cepError && <p className="text-xs text-danger">{cepError}</p>}
                                {!cepError && fieldErrors.cep && (
                                    <p className="text-xs text-danger">{fieldErrors.cep}</p>
                                )}
                            </div>

                            <div className="space-y-1 lg:col-span-9">
                                <label htmlFor="register-street" className="text-sm font-medium text-text">
                                    Rua / Logradouro
                                </label>
                                <Input
                                    id="register-street"
                                    placeholder="Av. Paulista"
                                    value={street}
                                    required
                                    readOnly
                                    aria-readonly="true"
                                    aria-invalid={Boolean(fieldErrors.street)}
                                    title="Campo preenchido automaticamente a partir do CEP"
                                />
                                {fieldErrors.street && <p className="text-xs text-danger">{fieldErrors.street}</p>}
                            </div>
                        </div>


                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="space-y-1 lg:col-span-4">
                                <label htmlFor="register-district" className="text-sm font-medium text-text">
                                    Bairro
                                </label>
                                <Input
                                    id="register-district"
                                    placeholder="Bela Vista"
                                    value={district}
                                    required
                                    readOnly
                                    aria-readonly="true"
                                    aria-invalid={Boolean(fieldErrors.district)}
                                    title="Campo preenchido automaticamente a partir do CEP"
                                />
                                {fieldErrors.district && (
                                    <p className="text-xs text-danger">{fieldErrors.district}</p>
                                )}
                            </div>
                            <div className="space-y-1 lg:col-span-6">
                                <label htmlFor="register-city" className="text-sm font-medium text-text">
                                    Cidade
                                </label>
                                <Input
                                    id="register-city"
                                    placeholder="São Paulo"
                                    value={city}
                                    required
                                    readOnly
                                    aria-readonly="true"
                                    aria-invalid={Boolean(fieldErrors.city)}
                                    title="Campo preenchido automaticamente a partir do CEP"
                                />
                                {fieldErrors.city && <p className="text-xs text-danger">{fieldErrors.city}</p>}
                            </div>
                            <div className="space-y-1 lg:col-span-2">
                                <label htmlFor="register-state" className="text-sm font-medium text-text">
                                    Estado (UF)
                                </label>
                                <Input
                                    id="register-state"
                                    placeholder="SP"
                                    value={stateUf}
                                    required
                                    maxLength={2}
                                    readOnly
                                    aria-readonly="true"
                                    aria-invalid={Boolean(fieldErrors.state)}
                                    title="Campo preenchido automaticamente a partir do CEP"
                                />
                                {fieldErrors.state && <p className="text-xs text-danger">{fieldErrors.state}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="space-y-1 lg:col-span-3">
                                <label htmlFor="register-number" className="text-sm font-medium text-text">
                                    Número
                                </label>
                                <Input
                                    id="register-number"
                                    placeholder="123"
                                    value={number}
                                    onChange={event => {
                                        setNumber(event.target.value);
                                        setFieldError('number');
                                    }}
                                    required
                                    aria-invalid={Boolean(fieldErrors.number)}
                                />
                                {fieldErrors.number && <p className="text-xs text-danger">{fieldErrors.number}</p>}
                            </div>
                            <div className="space-y-1 lg:col-span-5">
                                <label htmlFor="register-complement" className="text-sm font-medium text-text">
                                    Complemento
                                </label>
                                <Input
                                    id="register-complement"
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

                        <Button type="submit" fullWidth disabled={loading}>
                            {loading ? 'Criando conta...' : 'Criar conta'}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-text-muted">
                        Já possui cadastro?{' '}
                        <Link
                            href={
                                returnToParam ? `/login?returnTo=${encodeURIComponent(returnToParam)}` : '/login'
                            }
                            className="font-semibold text-primary underline-offset-2 hover:underline"
                        >
                            Entrar
                        </Link>
                    </p>
                </Card>
            </div>
        </main>
    );
}
