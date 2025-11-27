'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import useAuth from '@/src/hooks/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await register({ name, email, password });
      router.push('/medidas');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível criar a conta.';
      setError(message);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-md py-2xl">
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
            <div className="space-y-1">
              <label htmlFor="register-name" className="text-sm font-medium text-text">
                Nome completo
              </label>
              <Input
                id="register-name"
                placeholder="Maria Oliveira"
                value={name}
                onChange={event => setName(event.target.value)}
                required
              />
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
                onChange={event => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="register-password" className="text-sm font-medium text-text">
                Senha
              </label>
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                minLength={6}
                onChange={event => setPassword(event.target.value)}
                required
              />
            </div>

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Já possui cadastro?{' '}
            <Link
              href="/login"
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
