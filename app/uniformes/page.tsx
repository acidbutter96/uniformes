import Link from 'next/link';
import { StepsHeader } from '@/components/steps/StepsHeader';
import { UniformCard } from '@/components/cards/UniformCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const MOCK_UNIFORMS = [
  {
    id: 'camiseta-escolar',
    name: 'Camiseta Escolar',
    description: 'Malha leve, manga curta, ideal para o dia a dia escolar.',
    imageSrc:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Camiseta escolar dobrada',
  },

  {
    id: 'jaqueta-inverno',
    name: 'Jaqueta de Inverno',
    description: 'Jaqueta acolchoada com capuz removível e forro térmico.',
    imageSrc:
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Jaqueta escolar azul pendurada',
  },

  {
    id: 'calca-moletom',
    name: 'Calça Moletom',
    description: 'Cós ajustável, tecido macio e resistente para maior conforto.',
    imageSrc:
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Calça de moletom cinza',
  },

  {
    id: 'bermuda-esportiva',
    name: 'Bermuda Esportiva',
    description: 'Tecido dry-fit com recortes que permitem mobilidade total.',
    imageSrc:
      'https://images.unsplash.com/photo-1587391740164-3465c4b55086?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Bermuda esportiva cinza com detalhes',
  },
];

export default function UniformsPage() {
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
              {MOCK_UNIFORMS.map(uniform => (
                <UniformCard
                  key={uniform.id}
                  imageSrc={uniform.imageSrc}
                  imageAlt={uniform.imageAlt}
                  name={uniform.name}
                  description={uniform.description}
                />
              ))}
            </div>
          </div>

          <aside className="flex flex-col gap-md">
            <Card emphasis="muted" className="flex flex-col gap-sm">
              <h2 className="text-h3 font-heading">Dicas rápidas</h2>
              <ul className="flex flex-col gap-xs text-body text-text-muted">
                <li>Verifique o clima local para escolher peças adicionais.</li>
                <li>Consulte o calendário escolar para uniformes especiais.</li>
                <li>Você poderá revisar as peças escolhidas antes da confirmação.</li>
              </ul>
            </Card>

            <div className="flex flex-col gap-sm">
              <Link href="/escola" className="w-full">
                <Button variant="secondary" fullWidth>
                  Voltar
                </Button>
              </Link>
              <Button disabled>Continuar</Button>
              <span className="text-caption text-text-muted">
                Escolha um uniforme para continuar com as medidas.
              </span>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
