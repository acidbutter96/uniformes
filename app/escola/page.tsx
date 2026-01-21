'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { StepsHeader } from '@/app/components/steps/StepsHeader';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import type { School } from '@/app/lib/models/school';
import type { Supplier } from '@/app/lib/models/supplier';
import { loadOrderFlowState, saveOrderFlowState } from '@/app/lib/storage/order-flow';
import useAuth from '@/src/hooks/useAuth';

const supplierSupportsSchool = (supplier: Supplier, schoolId: string) => {
  const ids = Array.isArray(supplier.schoolIds)
    ? supplier.schoolIds
    : Array.isArray(supplier.schools)
      ? supplier.schools
      : [];

  return ids.includes(schoolId);
};

export default function SchoolStepPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (loading) return;
      if (!user) {
        router.replace(`/login?returnTo=${encodeURIComponent('/escola')}`);
        return;
      }

      const state = loadOrderFlowState();
      let effectiveSchoolId = state.schoolId;

      // Always try to refresh the schoolId from the latest user data when we have a childId.
      // This prevents stale order-flow state when the user updates the child's school on /conta.
      if (accessToken && state.childId) {
        try {
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
          });

          if (meRes.ok) {
            const mePayload = (await meRes.json().catch(() => ({}))) as {
              data?: { children?: Array<{ _id?: string; schoolId?: string }> };
            };

            const children = Array.isArray(mePayload?.data?.children)
              ? mePayload.data.children
              : [];
            const matchedChild = children.find(c => String(c?._id ?? '') === String(state.childId));
            const latestSchoolId = String(matchedChild?.schoolId ?? '').trim();

            if (latestSchoolId && latestSchoolId !== effectiveSchoolId) {
              saveOrderFlowState({ schoolId: latestSchoolId });
              effectiveSchoolId = latestSchoolId;
            }
          }
        } catch (error) {
          console.error('Failed to refresh user data', error);
        }
      }

      if (!effectiveSchoolId) {
        // If we don't have a school from the selected child, user must update account data.
        router.replace('/conta');
        return;
      }

      try {
        const [schoolsResponse, suppliersResponse] = await Promise.all([
          // Need the school's data, but API does not expose GET /api/schools/[id].
          // Fetch all and filter client-side.
          fetch('/api/schools?all=true', { cache: 'no-store' }),
          fetch('/api/suppliers', { cache: 'no-store' }),
        ]);

        if (!schoolsResponse.ok || !suppliersResponse.ok) {
          throw new Error('Não foi possível carregar as escolas ou fornecedores.');
        }

        const schoolsPayload = (await schoolsResponse.json()) as { data: School[] };
        const suppliersPayload = (await suppliersResponse.json()) as { data: Supplier[] };

        const schools = schoolsPayload.data ?? [];
        const suppliers = suppliersPayload.data ?? [];

        const matchedSchool = schools.find(item => item.id === effectiveSchoolId) ?? null;
        if (!matchedSchool) {
          setError('Não encontramos a escola vinculada ao aluno. Atualize os dados da conta.');
          setSchool(null);
          setSupplier(null);
          return;
        }

        setSchool(matchedSchool);
        setSupplier(suppliers.find(s => supplierSupportsSchool(s, matchedSchool.id)) ?? null);
      } catch (error) {
        console.error(error);
        setError('Não foi possível carregar os dados da escola.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [loading, user, accessToken, router]);

  const handleConfirmYes = () => {
    if (!school) return;

    saveOrderFlowState({
      schoolId: school.id,
      supplierId: supplier?.id,
      uniformId: undefined,
      measurements: undefined,
      suggestion: undefined,
      selectedSize: undefined,
      userName: undefined,
      orderId: undefined,
      orderCreatedAt: undefined,
    });

    router.push(`/uniformes?schoolId=${school.id}`);
  };

  const handleConfirmNo = () => {
    router.push('/conta#alunos-vinculados');
  };

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-2xl px-md py-2xl">
        <StepsHeader currentStep={2} />

        <section className="grid gap-xl lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col gap-lg">
            <div className="flex flex-col gap-sm">
              <h1 className="text-h2 font-heading">Validar Escola</h1>
              <p className="text-body text-text-muted">
                Vamos usar a escola cadastrada para o aluno selecionado. Confirme se está correta.
                Se não estiver, atualize os dados na sua conta.
              </p>
            </div>

            <Card className="flex flex-col gap-md" aria-live="polite">
              {isLoading ? (
                <p className="text-body text-text-muted">Carregando escola...</p>
              ) : error ? (
                <div className="flex flex-col gap-sm">
                  <p className="text-body text-text">{error}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push('/conta#alunos-vinculados')}
                  >
                    Ir para minha conta
                  </Button>
                </div>
              ) : school ? (
                <div className="flex flex-col gap-sm">
                  <p className="text-body text-text">A escola do aluno é:</p>
                  <div className="rounded-card border border-border bg-surface px-md py-sm">
                    <div className="text-body font-semibold">{school.name}</div>
                    <div className="text-caption text-text-muted">{school.city}</div>
                    {supplier ? (
                      <div className="mt-xs text-caption text-text-muted">
                        Fornecedor: <span className="font-medium text-text">{supplier.name}</span>
                      </div>
                    ) : (
                      <div className="mt-xs text-caption text-text-muted">
                        Nenhum fornecedor vinculado para esta escola.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-body text-text-muted">Nenhuma escola disponível.</p>
              )}
            </Card>
          </div>

          <aside className="flex flex-col gap-md">
            <Card emphasis="muted" className="flex flex-col gap-sm">
              <h2 className="text-h3 font-heading">Confirmação</h2>
              <p className="text-body text-text-muted">
                Está tudo certo com a escola cadastrada para este aluno?
              </p>
            </Card>

            <div className="flex flex-col gap-sm">
              <Button
                type="button"
                size="lg"
                disabled={!school || isLoading || !!error}
                onClick={handleConfirmYes}
              >
                Sim, está correta
              </Button>
              <Button type="button" size="lg" variant="secondary" onClick={handleConfirmNo}>
                Não, quero corrigir
              </Button>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
