'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordView />
    </Suspense>
  );
}

function ResetPasswordView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams?.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(token) && password.trim().length >= 8 && password === confirmPassword;
  }, [token, password, confirmPassword]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError('Token ausente. Use o link do e-mail.');
      return;
    }

    if (password.trim().length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(payload?.error ?? 'Não foi possível redefinir a senha.');
        return;
      }

      setMessage('Senha alterada com sucesso! Redirecionando para o login...');
      setTimeout(() => router.push('/login'), 1200);
    } catch {
      setError('Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-md py-2xl">
        <Card className="space-y-4 p-6">
          <header className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold">Definir nova senha</h1>
            <p className="text-sm text-text-muted">Crie uma senha nova para sua conta.</p>
          </header>

          {!token && (
            <Alert
              tone="danger"
              description="Token ausente. Abra esta página pelo link enviado no e-mail."
            />
          )}

          {error && <Alert tone="danger" description={error} />}
          {message && <Alert tone="success" description={message} />}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nova senha</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={!token}
                required
              />
              <p className="text-xs text-text-muted">Mínimo de 8 caracteres.</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Confirmar nova senha</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={!token}
                required
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={!canSubmit || loading}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.push('/login')}>
                Ir para login
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
