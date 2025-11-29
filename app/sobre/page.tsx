import Link from 'next/link';

import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { buttonClasses } from '@/app/components/ui/Button';

const pillarSections = [
  {
    title: 'Transparência institucional',
    description:
      'Cada dado coletado na Uniforma gera visibilidade imediata para o governo, permitindo planejamento de recursos e auditoria constante do processo.',
  },
  {
    title: 'Produção conectada',
    description:
      'Apoiada pelo Sindivest, a plataforma aproxima fornecedores e setor público, garantindo previsibilidade de produção e estoque sustentável.',
  },
  {
    title: 'Experiência acolhedora',
    description:
      'Famílias recebem orientação segura, com sugestão automática de tamanhos, prazos claros e comunicação centralizada com a escola e o fornecedor.',
  },
];

const steps = [
  {
    title: '1. Escolas habilitadas',
    description:
      'A instituição confirma participação no programa, cadastra modelos e tamanhos e acompanha reservas em tempo real.',
  },
  {
    title: '2. Famílias conectadas',
    description:
      'Responsáveis validam a escola, escolhem uniformes e registram medidas para receber uma sugestão de tamanho personalizada.',
  },
  {
    title: '3. Confecções integradas',
    description:
      'Com o fluxo antecipado de pedidos, as empresas planejam produção, ajustam estoque e organizam entregas com segurança.',
  },
  {
    title: '4. Acompanhamento contínuo',
    description:
      'Reservas registradas ficam disponíveis no painel da Uniforma, garantindo rastreabilidade e comunicação aberta entre todos os envolvidos.',
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex max-w-6xl flex-col gap-2xl px-md py-2xl">
        <section className="flex flex-col gap-lg">
          <Badge tone="accent" className="w-fit bg-accent/25 text-text">
            Sobre a Uniforma
          </Badge>
          <div className="flex flex-col gap-sm">
            <h1 className="text-h1 font-heading">
              Como a Uniforma transforma a jornada dos uniformes
            </h1>
            <p className="max-w-3xl text-body text-text-muted">
              A Uniforma é a ponte entre as necessidades das famílias, a organização das escolas, a
              capacidade produtiva das confecções e o compromisso do governo com um processo justo e
              transparente.
            </p>
          </div>
          <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
            <Link href="/escola" className={buttonClasses({ className: 'px-lg py-sm' })}>
              Iniciar uma reserva
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-xs px-lg py-sm text-body font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Voltar para a página inicial
            </Link>
          </div>
        </section>

        <section className="grid gap-lg md:grid-cols-3">
          {pillarSections.map(pillar => (
            <Card key={pillar.title} className="flex flex-col gap-sm p-lg">
              <h2 className="text-h3 font-heading text-primary">{pillar.title}</h2>
              <p className="text-body text-text-muted">{pillar.description}</p>
            </Card>
          ))}
        </section>

        <section className="flex flex-col gap-lg">
          <div className="flex flex-col gap-xs">
            <h2 className="text-h2 font-heading">Fluxo completo, ponta a ponta</h2>
            <p className="max-w-3xl text-body text-text-muted">
              Cada etapa foi desenhada para reduzir atritos e oferecer segurança a todos os públicos
              atendidos pela Uniforma.
            </p>
          </div>
          <div className="grid gap-lg md:grid-cols-2">
            {steps.map(step => (
              <Card key={step.title} emphasis="muted" className="flex flex-col gap-sm p-lg">
                <h3 className="text-h3 font-heading text-text">{step.title}</h3>
                <p className="text-body text-text-muted">{step.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-sm">
          <h2 className="text-h2 font-heading">Corrente de impacto positiva</h2>
          <Card emphasis="muted" className="flex flex-col gap-sm p-xl">
            <p className="text-body text-text">
              Famílias tranquilas → Escolas organizadas → Confecções fortalecidas → Economia local
              aquecida → Governo satisfeito.
            </p>
            <p className="text-body text-text-muted">
              Com dados centralizados e suporte institucional, a Uniforma entrega previsibilidade e
              confiança para longo prazo.
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}
