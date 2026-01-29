'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Card } from '@/app/components/ui/Card';
import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams?.get('token') ?? '';
  const emailFromQuery = searchParams?.get('email') ?? '';
  const isEmailLocked = Boolean(emailFromQuery);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    token ? 'loading' : 'idle',
  );
  const [message, setMessage] = useState<string | null>(null);

  const [email, setEmail] = useState(emailFromQuery);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => {
    const source = isEmailLocked ? emailFromQuery : email;
    return source.trim().toLowerCase();
  }, [email, emailFromQuery, isEmailLocked]);

  useEffect(() => {
    async function verify() {
      if (!token) return;
      setStatus('loading');
      setMessage(null);
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setStatus('error');
          setMessage(payload?.error ?? 'Não foi possível confirmar o e-mail.');
          return;
        }
        setStatus('success');
        setMessage('E-mail confirmado com sucesso! Você já pode entrar.');
        setTimeout(() => router.push('/login'), 1200);
      } catch {
        setStatus('error');
        setMessage('Não foi possível confirmar o e-mail.');
      }
    }
    verify();
  }, [token, router]);

  async function handleResend() {
    setResendMessage(null);
    if (!normalizedEmail) {
      setResendMessage('Informe seu e-mail para reenviar.');
      return;
    }
    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setResendMessage(payload?.error ?? 'Não foi possível reenviar o e-mail.');
        return;
      }
      const successMessage =
        'Se o e-mail existir e ainda não estiver confirmado, reenviamos o link.';
      setResendMessage(successMessage);
    } catch {
      setResendMessage('Não foi possível reenviar o e-mail.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-md py-2xl">
        <Card className="space-y-4 p-6">
          <header className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold">Confirmar e-mail</h1>
            <p className="text-sm text-text-muted">Confirme seu e-mail para ativar sua conta.</p>
          </header>

          {status === 'loading' && <Alert tone="info" description="Confirmando..." />}
          {status === 'success' && message && <Alert tone="success" description={message} />}
          {status === 'error' && message && <Alert tone="danger" description={message} />}

          {(status === 'error' || !token) && (
            <div className="space-y-3">
              <Alert
                tone="info"
                description="Não encontrou o e-mail? Você pode reenviar o link de confirmação."
              />

              <div className="space-y-1">
                <label className="text-sm font-medium">Seu e-mail</label>
                <Input
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={e => {
                    if (isEmailLocked) return;
                    setEmail(e.target.value);
                  }}
                  readOnly={isEmailLocked}
                  disabled={isEmailLocked}
                />
              </div>

              {resendMessage && <Alert tone="info" description={resendMessage} />}

              <div className="flex gap-3">
                <Button type="button" onClick={handleResend} disabled={resendLoading}>
                  {resendLoading ? 'Reenviando...' : 'Reenviar link'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => router.push('/login')}>
                  Ir para login
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
