'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';

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

export default function SupplierRegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('Link de convite inválido: token ausente.');
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
          name,
          email,
          password,
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
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-md py-2xl">
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
            <div className="space-y-1">
              <label htmlFor="supplier-name" className="text-sm font-medium text-text">
                Nome da empresa
              </label>
              <Input
                id="supplier-name"
                value={name}
                onChange={event => setName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="supplier-email" className="text-sm font-medium text-text">
                Email de contato
              </label>
              <Input
                id="supplier-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="supplier-password" className="text-sm font-medium text-text">
                Senha de acesso
              </label>
              <Input
                id="supplier-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                minLength={6}
                required
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
