"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { StepsHeader } from '@/app/components/steps/StepsHeader';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Alert } from '@/app/components/ui/Alert';
import { cn } from '@/app/lib/utils';
import { saveOrderFlowState, clearOrderFlowState } from '@/app/lib/storage/order-flow';
import useAuth from '@/src/hooks/useAuth';

interface ChildInfo {
  id?: string;
  name: string;
  age: number;
  schoolId: string;
}

export default function SelectChildStepPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();

  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasChildren = useMemo(() => children.length > 0, [children]);

  useEffect(() => {
    // Reset flow when starting
    clearOrderFlowState();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?returnTo=${encodeURIComponent('/alunos')}`);
      return;
    }

    const controller = new AbortController();
    async function loadCurrentUser() {
      try {
        const response = await fetch('/api/auth/me', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Falha ao carregar usuário.');
        const payload = await response.json();
        const rawChildren = Array.isArray(payload?.data?.children) ? payload.data.children : [];
        const parsed: ChildInfo[] = rawChildren
          .map((c: any) => ({
            id: typeof c?._id === 'string' ? c._id : undefined,
            name: String(c?.name ?? ''),
            age: Number(c?.age ?? 0),
            schoolId: String(c?.schoolId ?? ''),
          }))
          .filter(c => c.name && Number.isFinite(c.age) && c.age >= 0);
        setChildren(parsed);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Failed to load current user', err);
        }
      }
    }
    loadCurrentUser();
    return () => controller.abort();
  }, [loading, user, accessToken, router]);

  const handleContinue = () => {
    setError(null);

    if (!hasChildren) {
      // No children linked: redirect to account settings to add a child
      router.push('/conta');
      return;
    }

    if (selectedIndex === null) {
      setError('Selecione o aluno para continuar.');
      return;
    }

    const child = children[selectedIndex];

    // Save initial flow state using child's school and id
    const schoolId = child.schoolId || undefined;
    saveOrderFlowState({ schoolId, childId: child.id });

    router.push('/escola');
  };

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-2xl px-md py-2xl">
        <StepsHeader currentStep={1} />

        <section className="grid gap-xl lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="flex flex-col gap-lg">
            <header className="flex flex-col gap-xs">
              <span className="text-caption font-medium uppercase tracking-wide text-primary">
                Etapa 1 de 6
              </span>
              <h1 className="text-h2 font-heading">Selecione o aluno</h1>
              <p className="text-body text-text-muted">
                Escolha para quem a reserva será feita. Se não houver alunos cadastrados, você pode continuar e informar a escola na próxima etapa.
              </p>
            </header>

            {error && <Alert tone="danger" description={error} />}

            {hasChildren ? (
              <ul className="flex flex-col gap-sm">
                {children.map((child, idx) => {
                  const selected = idx === selectedIndex;
                  return (
                    <li key={`${child.name}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedIndex(idx)}
                        className={cn(
                          'flex w-full flex-col gap-xxs rounded-card border px-md py-sm text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          selected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-surface text-text hover:border-primary/40',
                        )}
                      >
                        <span className="text-body font-semibold">{child.name}</span>
                        <span className="text-caption text-text-muted">{child.age} anos</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Card emphasis="muted" className="flex flex-col gap-sm">
                <p className="text-body text-text">
                  Nenhum aluno cadastrado na sua conta.
                </p>
                <p className="text-caption text-text-muted">
                  Cadastre um filho nas configurações da conta para iniciar uma reserva.
                </p>
                <div>
                  <Link href="/conta" className="inline-block">
                    <Button variant="secondary">Ir para configurações da conta</Button>
                  </Link>
                </div>
              </Card>
            )}

            <div className="flex items-center justify-between">
              <Link href="/reservas" className="text-caption text-text-muted">
                Voltar para Minhas Reservas
              </Link>
              <Button size="lg" onClick={handleContinue} disabled={!hasChildren}>
                Continuar
              </Button>
            </div>
          </Card>

          <aside className="flex flex-col gap-md"></aside>
        </section>
      </div>
    </main>
  );
}
