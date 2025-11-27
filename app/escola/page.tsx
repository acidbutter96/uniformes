'use client';

import { useMemo, useState } from 'react';
import { StepsHeader } from '@/components/steps/StepsHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/app/lib/utils';

const MOCK_SCHOOLS = [
  {
    id: 'escola-aurora',
    name: 'Escola Aurora do Saber',
    city: 'São Paulo',
    state: 'SP',
    status: 'Parceria ativa',
  },
  {
    id: 'colegio-horizonte',
    name: 'Colégio Horizonte Azul',
    city: 'Campinas',
    state: 'SP',
    status: 'Parceria ativa',
  },
  {
    id: 'instituto-viver',
    name: 'Instituto Viver e Aprender',
    city: 'Rio de Janeiro',
    state: 'RJ',
    status: 'Em validação',
  },
  {
    id: 'colegio-monte',
    name: 'Colégio Monte Verde',
    city: 'Curitiba',
    state: 'PR',
    status: 'Parceria ativa',
  },
  {
    id: 'escola-luz',
    name: 'Escola Luz do Amanhã',
    city: 'Salvador',
    state: 'BA',
    status: 'Em validação',
  },
];

export default function SchoolStepPage() {
  const [query, setQuery] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  const filteredSchools = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return MOCK_SCHOOLS;

    return MOCK_SCHOOLS.filter(({ name, city }) => {
      const haystack = `${name} ${city}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [query]);

  const selectedSchool = filteredSchools.find(school => school.id === selectedSchoolId);

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
                  {filteredSchools.length === 0 && (
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
                          <span className="text-caption text-text-muted">
                            {school.city} • {school.state} • {school.status}
                          </span>
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
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Estado</dt>
                    <dd className="font-medium">{selectedSchool.state}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Status</dt>
                    <dd className="font-medium">{selectedSchool.status}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-body text-text-muted">
                  Selecione uma escola para ver os detalhes. Essas informações ajudam a confirmar se
                  você está no lugar certo.
                </p>
              )}
            </Card>

            <Button type="button" disabled={!selectedSchool} size="lg">
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
