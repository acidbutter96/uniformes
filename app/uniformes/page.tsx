'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { StepsHeader } from '@/app/components/steps/StepsHeader';
import { UniformCard } from '@/app/components/cards/UniformCard';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import type { Uniform } from '@/app/lib/models/uniform';
import type { Supplier } from '@/app/lib/models/supplier';
import { loadOrderFlowState, saveOrderFlowState } from '@/app/lib/storage/order-flow';

export default function UniformsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolIdFromParams = searchParams.get('schoolId');

  const [isLoading, setIsLoading] = useState(true);
  const [uniforms, setUniforms] = useState<Uniform[]>([]);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [selectedUniformId, setSelectedUniformId] = useState<string | null>(null);

  useEffect(() => {
    const state = loadOrderFlowState();

    if (!state.schoolId) {
      router.replace('/escola');
      return;
    }

    if (schoolIdFromParams && schoolIdFromParams !== state.schoolId) {
      saveOrderFlowState({ schoolId: schoolIdFromParams });
    }

    const fetchData = async () => {
      try {
        const [uniformsResponse, suppliersResponse] = await Promise.all([
          fetch('/api/uniforms'),
          fetch('/api/suppliers'),
        ]);

        if (!uniformsResponse.ok || !suppliersResponse.ok) {
          throw new Error('Não foi possível carregar os uniformes.');
        }

        const uniformsPayload = (await uniformsResponse.json()) as { data: Uniform[] };
        const suppliersPayload = (await suppliersResponse.json()) as { data: Supplier[] };

        setUniforms(uniformsPayload.data ?? []);

        const currentSchoolId = schoolIdFromParams ?? state.schoolId;
        let matchedSupplier: Supplier | undefined;

        if (currentSchoolId) {
          matchedSupplier = suppliersPayload.data?.find(currentSupplier =>
            currentSupplier.schools.includes(currentSchoolId),
          );
        }

        if (matchedSupplier) {
          setSupplier(matchedSupplier);
          saveOrderFlowState({ supplierId: matchedSupplier.id });
        }

        if (state.uniformId) {
          setSelectedUniformId(state.uniformId);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router, schoolIdFromParams]);

  const filteredUniforms = useMemo(() => {
    if (!supplier) {
      return uniforms;
    }

    return uniforms.filter(uniform => uniform.supplierId === supplier.id);
  }, [supplier, uniforms]);

  const handleSelect = (uniform: Uniform) => {
    setSelectedUniformId(uniform.id);
    saveOrderFlowState({ uniformId: uniform.id });
  };

  const handleContinue = () => {
    if (!selectedUniformId) return;

    router.push('/medidas');
  };

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-2xl px-md py-2xl">
        <StepsHeader currentStep={2} />

        <section className="grid gap-lg lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-lg">
            <header className="flex flex-col gap-xs">
              <span className="text-caption font-medium uppercase tracking-wide text-primary">
                Etapa 2 de 4
              </span>
              <h1 className="text-h2 font-heading">Selecione o uniforme</h1>
              <p className="max-w-2xl text-body text-text-muted">
                Escolha o uniforme adequado para a criança. Você poderá ajustar quantidades e
                medidas na próxima etapa.
              </p>
            </header>

            <div className="grid gap-lg sm:grid-cols-2">
              {filteredUniforms.map(uniform => (
                <UniformCard
                  key={uniform.id}
                  imageSrc={uniform.imageSrc ?? ''}
                  imageAlt={uniform.imageAlt ?? uniform.name}
                  name={uniform.name}
                  description={uniform.description}
                  onSelect={() => handleSelect(uniform)}
                  buttonLabel={selectedUniformId === uniform.id ? 'Selecionado' : 'Selecionar'}
                  buttonProps={{
                    variant: selectedUniformId === uniform.id ? 'primary' : 'secondary',
                    disabled: isLoading,
                  }}
                  className={selectedUniformId === uniform.id ? 'ring-2 ring-primary' : undefined}
                />
              ))}
              {!isLoading && filteredUniforms.length === 0 && (
                <Card
                  emphasis="muted"
                  className="items-center justify-center text-center text-body"
                >
                  Nenhum uniforme disponível para esta escola.
                </Card>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-md">
            <Card emphasis="muted" className="flex flex-col gap-sm">
              <h2 className="text-h3 font-heading">Resumo</h2>
              <dl className="flex flex-col gap-xs text-body text-text">
                <div className="flex justify-between">
                  <dt className="text-text-muted">Fornecedor</dt>
                  <dd className="font-medium">{supplier?.name ?? 'Não identificado'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Uniformes</dt>
                  <dd className="font-medium">{filteredUniforms.length}</dd>
                </div>
              </dl>
              <p className="text-caption text-text-muted">
                Continue para informar as medidas e receber a sugestão de tamanho ideal.
              </p>
            </Card>

            <div className="flex flex-col gap-sm">
              <Link href="/escola" className="w-full">
                <Button variant="secondary" fullWidth>
                  Voltar
                </Button>
              </Link>
              <Button onClick={handleContinue} disabled={!selectedUniformId || isLoading}>
                Continuar
              </Button>
              {!selectedUniformId && (
                <span className="text-caption text-text-muted">
                  Escolha um uniforme para continuar com as medidas.
                </span>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
