'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!normalizedEmail) {
      setError('Informe seu e-mail.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(payload?.error ?? 'Não foi possível solicitar recuperação de senha.');
        return;
      }

      setMessage(
        'Se este e-mail estiver cadastrado, enviamos um link para redefinir sua senha. Verifique sua caixa de entrada e spam.',
      );
    } catch {
      setError('Não foi possível solicitar recuperação de senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-md py-2xl">
        <Card className="space-y-4 p-6">
          <header className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold">Recuperar senha</h1>
            <p className="text-sm text-text-muted">
              Informe seu e-mail para receber um link de redefinição.
            </p>
          </header>

          {error && <Alert tone="danger" description={error} />}
          {message && <Alert tone="success" description={message} />}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Seu e-mail</label>
              <Input
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.push('/login')}>
                Voltar
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
