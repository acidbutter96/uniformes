'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Alert } from '@/app/components/ui/Alert';

const VALID_CREDENTIALS = {
  username: 'admin',
  password: 'uniformes123',
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();

    if (!normalizedUsername || !normalizedPassword) {
      setError('Informe usuário e senha para continuar.');
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 600));

      if (
        normalizedUsername !== VALID_CREDENTIALS.username ||
        normalizedPassword !== VALID_CREDENTIALS.password
      ) {
        setError('Credenciais inválidas. Tente novamente.');
        return;
      }

      router.push('/admin/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-text">
      <Card className="w-full max-w-md space-y-lg p-lg">
        <header className="space-y-xs text-center">
          <h1 className="text-h2 font-heading">Acesso Administrativo</h1>
          <p className="text-body text-text-muted">
            Utilize o usuário e senha fornecidos pela coordenação para acessar o painel.
          </p>
        </header>

        <form className="space-y-md" onSubmit={handleSubmit} noValidate>
          <div className="space-y-xs">
            <label htmlFor="username" className="text-body font-medium text-text">
              Usuário
            </label>
            <Input
              id="username"
              value={username}
              onChange={event => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="ex: admin"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-xs">
            <label htmlFor="password" className="text-body font-medium text-text">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? 'Validando…' : 'Entrar'}
          </Button>
        </form>

        {error && <Alert tone="danger" heading="Não foi possível acessar" description={error} />}

        <p className="text-center text-caption text-text-muted">
          Este acesso é restrito ao time administrativo responsável pelo cadastro de escolas e
          uniformes.
        </p>
      </Card>
    </main>
  );
}
