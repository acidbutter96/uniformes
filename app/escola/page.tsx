'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { StepsHeader } from '@/app/components/steps/StepsHeader';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { cn } from '@/app/lib/utils';
import type { School } from '@/app/lib/models/school';
import type { Supplier } from '@/app/lib/models/supplier';
import { clearOrderFlowState, saveOrderFlowState } from '@/app/lib/storage/order-flow';

export default function SchoolStepPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  const filteredSchools = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return schools;

    return schools.filter(({ name, city }) => {
      const haystack = `${name} ${city}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [query, schools]);

  const selectedSchool = schools.find(school => school.id === selectedSchoolId) ?? null;
  const selectedSupplier = selectedSchool
    ? (suppliers.find(supplier => supplier.schools.includes(selectedSchool.id)) ?? null)
    : null;

  useEffect(() => {
    clearOrderFlowState();

    const fetchData = async () => {
      try {
        const [schoolsResponse, suppliersResponse] = await Promise.all([
          fetch('/api/schools'),
          fetch('/api/suppliers'),
        ]);

        if (!schoolsResponse.ok || !suppliersResponse.ok) {
          throw new Error('Não foi possível carregar as escolas ou fornecedores.');
        }

        const schoolsPayload = (await schoolsResponse.json()) as { data: School[] };
        const suppliersPayload = (await suppliersResponse.json()) as { data: Supplier[] };

        setSchools(schoolsPayload.data ?? []);
        setSuppliers(suppliersPayload.data ?? []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleContinue = () => {
    if (!selectedSchool) return;

    const supplierId = selectedSupplier?.id;

    saveOrderFlowState({
      schoolId: selectedSchool.id,
      supplierId,
      uniformId: undefined,
      measurements: undefined,
      suggestion: undefined,
      userName: undefined,
      orderId: undefined,
      orderCreatedAt: undefined,
    });

    router.push(`/uniformes?schoolId=${selectedSchool.id}`);
  };

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-2xl px-md py-2xl">
        <StepsHeader currentStep={1} />

        <section className="grid gap-xl lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col gap-lg">
            <div className="flex flex-col gap-sm">
              <h1 className="text-h2 font-heading">Validar Escola</h1>
              <p className="text-body text-text-muted">
                Pesquise o nome da escola participante e selecione para continuar. Se não encontrar,
                você poderá solicitar inclusão na próxima etapa.
              </p>
            </div>

            <Card className="flex flex-col gap-md">
              <div className="flex flex-col gap-xs">
                <label htmlFor="school-search" className="text-body font-medium text-text">
                  Nome da escola
                </label>
                <Input
                  id="school-search"
                  placeholder="Ex: Colégio Horizonte"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  aria-label="Buscar escola"
                />
              </div>

              <div className="flex flex-col gap-xs">
                <h2 className="text-caption font-medium uppercase tracking-wide text-text-muted">
                  Resultados
                </h2>
                <ul className="flex max-h-80 flex-col gap-sm overflow-y-auto" aria-live="polite">
                  {!isLoading && filteredSchools.length === 0 && (
                    <li className="rounded-card border border-dashed border-border bg-background px-md py-sm text-caption text-text-muted">
                      Nenhuma escola encontrada. Verifique a grafia ou tente outra cidade.
                    </li>
                  )}

                  {filteredSchools.map(school => {
                    const isSelected = school.id === selectedSchoolId;
                    return (
                      <li key={school.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedSchoolId(school.id)}
                          className={cn(
                            'flex w-full flex-col gap-xs rounded-card border border-border bg-surface px-md py-sm text-left transition hover:border-primary/40 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                            isSelected && 'border-primary bg-primary/10 text-primary',
                          )}
                        >
                          <span className="text-body font-semibold">{school.name}</span>
                          <span className="text-caption text-text-muted">{school.city}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>
          </div>

          <aside className="flex flex-col gap-md">
            <Card emphasis="muted" className="flex flex-col gap-sm">
              <h2 className="text-h3 font-heading">Detalhes da escola</h2>
              {selectedSchool ? (
                <dl className="flex flex-col gap-xs text-body text-text">
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Nome</dt>
                    <dd className="font-medium">{selectedSchool.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Cidade</dt>
                    <dd className="font-medium">{selectedSchool.city}</dd>
                  </div>
                  {selectedSupplier ? (
                    <div className="flex justify-between">
                      <dt className="text-text-muted">Fornecedor</dt>
                      <dd className="font-medium">{selectedSupplier.name}</dd>
                    </div>
                  ) : (
                    <p className="text-caption text-text-muted">
                      Nenhum fornecedor vinculado para esta escola.
                    </p>
                  )}
                </dl>
              ) : (
                <p className="text-body text-text-muted">
                  Selecione uma escola para ver os detalhes. Essas informações ajudam a confirmar se
                  você está no lugar certo.
                </p>
              )}
            </Card>

            <Button
              type="button"
              disabled={!selectedSchool || isLoading}
              size="lg"
              onClick={handleContinue}
            >
              Continuar
            </Button>
            {!selectedSchool && (
              <span className="text-caption text-text-muted">
                Escolha uma escola para liberar a próxima etapa.
              </span>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
