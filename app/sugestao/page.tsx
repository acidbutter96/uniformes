import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/app/lib/utils';
import { StepsHeader } from '@/app/components/steps/StepsHeader';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';

const MOCK_UNIFORM = {
  name: 'Jaqueta de Inverno',
  description: 'Tecido térmico, forro leve e capuz removível. Ideal para dias frios.',
  imageSrc:
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=800&q=80',
  imageAlt: 'Jaqueta escolar azul pendurada',
};

const MOCK_SUGGESTION = {
  size: 'M',
  confidence: 0.82,
  summary: 'O tamanho M oferece ajuste confortável para crescimento nos próximos meses.',
  details: [
    'Altura de 148 cm sugere tamanho entre M e G, optamos por M considerando folga leve.',
    'Peso de 42 kg mantém o caimento alinhado ao guia da escola.',
    'Medidas de tórax e cintura indicam espaço para camadas adicionais em dias frios.',
  ],
};

export default function SuggestionPage() {
  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-2xl px-md py-2xl">
        <StepsHeader currentStep={4} />

        <section className="grid gap-xl lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="flex flex-col gap-lg">
            <header className="flex flex-col gap-sm">
              <span className="text-caption font-medium uppercase tracking-wide text-primary">
                Etapa 4 de 4
              </span>
              <h1 className="text-h2 font-heading">Confirme a reserva</h1>
              <p className="text-body text-text-muted">
                Revise o uniforme e o tamanho sugerido antes de reservar. Você ainda pode ajustar as
                medidas, se preferir.
              </p>
            </header>

            <div className="grid gap-lg sm:grid-cols-[200px_1fr]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-card bg-background">
                <Image
                  src={MOCK_UNIFORM.imageSrc}
                  alt={MOCK_UNIFORM.imageAlt}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              </div>
              <div className="flex flex-col gap-sm">
                <h2 className="text-h3 font-heading">{MOCK_UNIFORM.name}</h2>
                <p className="text-body text-text-muted">{MOCK_UNIFORM.description}</p>
                <div className="flex flex-col gap-xs">
                  <span className="text-caption uppercase tracking-wide text-text-muted">
                    Tamanho sugerido
                  </span>
                  <span className="inline-flex items-center gap-xs rounded-card bg-primary/10 px-md py-xs text-body font-semibold text-primary">
                    {MOCK_SUGGESTION.size}
                    <span aria-hidden>•</span>
                    Confiança {(MOCK_SUGGESTION.confidence * 100).toFixed(0)}%
                  </span>
                  <p className="text-body text-text">{MOCK_SUGGESTION.summary}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-sm">
              <h3 className="text-caption font-medium uppercase tracking-wide text-text-muted">
                Por que sugerimos esse tamanho
              </h3>
              <ul className="flex flex-col gap-xs text-body text-text">
                {MOCK_SUGGESTION.details.map(item => (
                  <li key={item} className="rounded-card bg-background px-md py-xs">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-sm md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-sm sm:flex-row sm:items-center md:order-2">
                <Button size="lg" type="button">
                  Confirmar reserva
                </Button>
                <Link
                  href="/medidas"
                  className={cn(
                    'inline-flex items-center justify-center gap-xs rounded-card border border-border bg-surface px-lg py-sm text-body font-semibold text-text transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  )}
                >
                  Ajustar medidas
                </Link>
              </div>
              <span className="text-caption text-text-muted md:order-1">
                Ao confirmar, registraremos a reserva e você será orientado sobre a retirada na
                loja.
              </span>
            </div>
          </Card>

          <aside className="flex flex-col gap-md">
            <Card emphasis="muted" className="flex flex-col gap-sm">
              <h2 className="text-h3 font-heading">Resumo rápido</h2>
              <dl className="flex flex-col gap-xs text-body text-text">
                <div className="flex justify-between">
                  <dt className="text-text-muted">Uniforme</dt>
                  <dd className="font-medium">{MOCK_UNIFORM.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Tamanho</dt>
                  <dd className="font-medium">{MOCK_SUGGESTION.size}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Confiança</dt>
                  <dd className="font-medium">{(MOCK_SUGGESTION.confidence * 100).toFixed(0)}%</dd>
                </div>
              </dl>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}
