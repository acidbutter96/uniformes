'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';

import { PasswordField } from '@/app/components/forms/PasswordField';
import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { clearOrderFlowState } from '@/app/lib/storage/order-flow';
import useAuth from '@/src/hooks/useAuth';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginView />
    </Suspense>
  );
}

function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);

  const returnToParam = searchParams?.get('returnTo') ?? null;
  const oauthError = searchParams?.get('error');

  useEffect(() => {
    if (!oauthError) {
      return;
    }

    const oauthErrorMessages: Record<string, string> = {
      google_access_denied: 'Permissão negada no Google. Tente novamente.',
      google_oauth_error: 'O Google retornou um erro. Tente novamente mais tarde.',
      google_missing_code: 'Não foi possível validar o retorno do Google.',
      google_state_mismatch: 'Sessão expirada. Tente fazer login novamente.',
      google_state_expired: 'Sessão expirada. Inicie novamente o login com Google.',
      google_exchange_failed: 'Falha ao trocar o código do Google por token.',
      google_missing_access_token: 'O Google não retornou um token válido.',
      google_profile_failed: 'Não foi possível recuperar seu perfil Google.',
      google_unexpected_error: 'Erro inesperado ao autenticar com Google.',
    };

    setError(oauthErrorMessages[oauthError] ?? 'Falha ao autenticar com Google.');
  }, [oauthError]);

  const resolveDestination = (role?: string | null) => {
    // Sempre que logar, resetar o fluxo de reservas para a primeira tela
    // e não voltar para passos intermediários do fluxo.
    clearOrderFlowState();

    if (role === 'admin') {
      return '/admin/dashboard';
    }

    if (role === 'supplier') {
      return '/admin/dashboard';
    }

    // Para usuários comuns, sempre começar o fluxo em /alunos
    return '/alunos';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      const authenticatedUser = await login(email, password);
      const role = typeof authenticatedUser?.role === 'string' ? authenticatedUser.role : null;
      router.push(resolveDestination(role));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível entrar.';
      setError(message);
    }
  };

  const handleGoogleLogin = () => {
    setError(null);
    setIsGoogleRedirecting(true);
    const googleStartUrl = returnToParam
      ? `/api/auth/google/start?returnTo=${encodeURIComponent(returnToParam)}`
      : '/api/auth/google/start';
    window.location.href = googleStartUrl;
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

          {error && (
            <div className="mb-4 space-y-3">
              <Alert tone="danger" description={error} />
              {String(error).toLowerCase().includes('não confirmado') && email.trim() && (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`)
                    }
                  >
                    Reenviar confirmação
                  </Button>
                </div>
              )}
            </div>
          )}

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

            <PasswordField
              id="login-password"
              label="Senha"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />

            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
              >
                Esqueci minha senha
              </Link>
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
              disabled={loading || isGoogleRedirecting}
              className="flex items-center justify-center gap-2"
            >
              <Image src="/images/google-svgrepo-com.svg" alt="Google" width={20} height={20} />
              <span>{isGoogleRedirecting ? 'Redirecionando…' : 'Entrar com Google'}</span>
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-text-muted">
            Ainda não tem conta?{' '}
            <Link
              href={
                returnToParam
                  ? `/register?returnTo=${encodeURIComponent(returnToParam)}`
                  : '/register'
              }
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
