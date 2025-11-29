'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { Alert } from '@/app/components/ui/Alert';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import type { SchoolDTO } from '@/src/types/school';

interface PreCadastroForm {
  email: string;
  childName: string;
  schoolId: string;
}

export default function PreCadastroPage() {
  const [form, setForm] = useState<PreCadastroForm>({ email: '', childName: '', schoolId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolDTO[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSchools = async () => {
      setLoadingSchools(true);
      try {
        const response = await fetch('/api/schools', { cache: 'no-store' });
        const payload = (await response.json()) as { data?: SchoolDTO[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? 'Não foi possível carregar as escolas.');
        }

        if (active) {
          setSchools(payload.data ?? []);
          setSchoolsError(null);
        }
      } catch (error) {
        console.error('Failed to load schools', error);
        if (active) {
          setSchoolsError('Não foi possível carregar a lista de escolas.');
        }
      } finally {
        if (active) {
          setLoadingSchools(false);
        }
      }
    };

    loadSchools();

    return () => {
      active = false;
    };
  }, []);

  const selectedSchool = useMemo(
    () => schools.find(school => school.id === form.schoolId),
    [form.schoolId, schools],
  );

  const handleChange = (field: keyof PreCadastroForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('idle');
    setMessage(null);

    if (!selectedSchool) {
      setStatus('error');
      setMessage('Selecione uma escola para continuar.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/pre-cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          childName: form.childName,
          schoolId: selectedSchool.id,
          schoolName: selectedSchool.name,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Não foi possível enviar o pré-cadastro.');
      }

      setStatus('success');
      setMessage('Pré-cadastro enviado com sucesso! Em breve entraremos em contato.');
      setForm({ email: '', childName: '', schoolId: '' });
    } catch (error) {
      setStatus('error');
      const errMsg = error instanceof Error ? error.message : 'Falha ao enviar o pré-cadastro.';
      setMessage(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-md py-2xl">
        <div className="space-y-3 text-center">
          <p className="text-caption font-semibold uppercase tracking-[0.2em] text-primary">
            Pré-cadastro
          </p>
          <h1 className="text-4xl font-semibold text-text">Reserve um lugar na fila</h1>
          <p className="text-body text-text-muted">
            Informe os dados abaixo para antecipar o atendimento da sua escola e receber novidades
            sobre o processo.
          </p>
        </div>

        <Card className="rounded-2xl border border-border p-8 shadow-card">
          {status !== 'idle' && message && (
            <Alert
              tone={status === 'success' ? 'success' : 'danger'}
              description={message}
              className="mb-6"
            />
          )}

          {schoolsError && <Alert tone="danger" description={schoolsError} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="pre-email" className="text-sm font-medium text-text">
                Email de contato
              </label>
              <Input
                id="pre-email"
                type="email"
                placeholder="voce@escola.com"
                value={form.email}
                onChange={event => handleChange('email', event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="pre-child" className="text-sm font-medium text-text">
                Nome da criança
              </label>
              <Input
                id="pre-child"
                placeholder="Ex: Ana Beatriz"
                value={form.childName}
                onChange={event => handleChange('childName', event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="pre-school" className="text-sm font-medium text-text">
                Escola
              </label>
              <select
                id="pre-school"
                value={form.schoolId}
                onChange={event => handleChange('schoolId', event.target.value)}
                className="w-full rounded-card border border-border bg-surface px-md py-sm text-body text-text shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-primary/40"
                required
                disabled={loadingSchools || submitting || schools.length === 0}
              >
                <option value="" disabled>
                  {loadingSchools ? 'Carregando escolas...' : 'Selecione uma escola'}
                </option>
                {!loadingSchools &&
                  schools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name} — {school.city}
                    </option>
                  ))}
              </select>
            </div>

            <Button
              type="submit"
              fullWidth
              disabled={submitting || loadingSchools || schools.length === 0}
            >
              {submitting ? 'Enviando...' : 'Enviar pré-cadastro'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
