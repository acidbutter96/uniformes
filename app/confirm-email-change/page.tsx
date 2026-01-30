'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Card } from '@/app/components/ui/Card';
import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';

export default function ConfirmEmailChangePage() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailChangeView />
    </Suspense>
  );
}

function ConfirmEmailChangeView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token') ?? '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    token ? 'loading' : 'error',
  );
  const [message, setMessage] = useState<string>(
    token ? 'Confirmando alteração...' : 'Token ausente.',
  );

  useEffect(() => {
    async function confirm() {
      if (!token) return;
      setStatus('loading');
      setMessage('Confirmando alteração...');
      try {
        const res = await fetch(
          `/api/auth/confirm-email-change?token=${encodeURIComponent(token)}`,
        );
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setStatus('error');
          setMessage(payload?.error ?? 'Não foi possível confirmar a alteração.');
          return;
        }
        setStatus('success');
        setMessage('E-mail alterado com sucesso! Faça login novamente.');
        setTimeout(() => router.push('/login'), 1200);
      } catch {
        setStatus('error');
        setMessage('Não foi possível confirmar a alteração.');
      }
    }
    confirm();
  }, [token, router]);

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-md py-2xl">
        <Card className="space-y-4 p-6">
          <header className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold">Confirmar alteração de e-mail</h1>
            <p className="text-sm text-text-muted">Finalize a alteração do seu e-mail.</p>
          </header>

          {status === 'loading' && <Alert tone="info" description={message} />}
          {status === 'success' && <Alert tone="success" description={message} />}
          {status === 'error' && <Alert tone="danger" description={message} />}

          <div className="flex justify-center">
            <Button type="button" variant="secondary" onClick={() => router.push('/login')}>
              Ir para login
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
