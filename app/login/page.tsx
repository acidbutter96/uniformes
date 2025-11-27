'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import useAuth from '@/src/hooks/useAuth';

export default function LoginPage() {
    const router = useRouter();
    const { login, loading, loginWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        try {
            await login(email, password);
            router.push('/admin/dashboard');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Não foi possível entrar.';
            setError(message);
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);

        try {
            const googleToken = (window as typeof window & { googleOAuthToken?: string })
                .googleOAuthToken;

            if (!googleToken) {
                window.location.href = '/api/auth/google';
                return;
            }

            await loginWithGoogle(googleToken);
            router.push('/admin/dashboard');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Falha ao conectar com Google.';
            setError(message);
        }
    };

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-md py-2xl">
                <Card className="rounded-2xl border border-border p-8 shadow-card">
                    <div className="mb-6 space-y-2 text-center">
                        <p className="text-caption font-medium uppercase tracking-wider text-primary">
                            Acesse sua conta
                        </p>
                        <h1 className="text-3xl font-semibold text-text">Bem-vindo de volta</h1>
                        <p className="text-sm text-text-muted">
                            Use suas credenciais para acessar o painel e acompanhar os pedidos.
                        </p>
                    </div>

                    {error && <Alert tone="danger" description={error} className="mb-4" />}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label htmlFor="login-email" className="text-sm font-medium text-text">
                                Email
                            </label>
                            <Input
                                id="login-email"
                                type="email"
                                autoComplete="email"
                                placeholder="voce@escola.com"
                                value={email}
                                onChange={event => setEmail(event.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="login-password" className="text-sm font-medium text-text">
                                Senha
                            </label>
                            <Input
                                id="login-password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={event => setPassword(event.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" fullWidth disabled={loading}>
                            {loading ? 'Entrando...' : 'Entrar'}
                        </Button>
                    </form>

                    <div className="mt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            fullWidth
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            Entrar com Google
                        </Button>
                    </div>

                    <p className="mt-6 text-center text-sm text-text-muted">
                        Ainda não tem conta?{' '}
                        <Link
                            href="/register"
                            className="font-semibold text-primary underline-offset-2 hover:underline"
                        >
                            Criar cadastro
                        </Link>
                    </p>
                </Card>
            </div>
        </main>
    );
}
