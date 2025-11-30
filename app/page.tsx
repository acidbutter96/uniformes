import Link from 'next/link';

import { Card } from '@/app/components/ui/Card';
import { buttonClasses } from '@/app/components/ui/Button';

const governmentPoints = [
  'Visão clara da demanda de cada escola.',
  'Planejamento mais eficiente do uso de recursos.',
  'Controle sobre padrões, tamanhos e distribuição.',
  'Processo digital seguro, previsível e auditável.',
];

const industryPoints = [
  'Conecta o poder público às confecções do DF.',
  'Gera oportunidades reais para o setor têxtil local.',
  'Movimenta a economia e fortalece empregos.',
  'Valoriza quem produz com previsibilidade.',
];

const manufacturerBenefits = [
  {
    title: 'Maior controle de atendimento e fabricação',
    description:
      'Produção baseada em dados reais reduz erros e dá visibilidade aos pedidos por escola e período.',
  },
  {
    title: 'Estoque sustentável',
    description:
      'Reservas antecipadas evitam desperdícios e mantêm estoques enxutos, inteligentes e rentáveis.',
  },
  {
    title: 'Relacionamento facilitado',
    description:
      'Comunicação centralizada, calendários claros e padronização de tamanhos, modelos e lotes.',
  },
];

const familyBenefits = [
  'Sugestão automática de tamanhos com base nas medidas cadastradas.',
  'Reserva garantida antes do período letivo.',
  'Prazos claros, disponibilidade transparente e experiência segura.',
];

const schoolBenefits = [
  'Cadastro organizado de uniformes, modelos e tamanhos.',
  'Acompanhamento das reservas em tempo real.',
  'Comunicação direta com fornecedores e planejamento eficiente.',
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-2xl px-md py-2xl">
        <section className="grid items-start gap-xl py-xl md:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-lg">
            <div className="flex flex-col gap-sm">
              <h1 className="text-h1 font-heading">
                Uniforma — gestão inteligente de uniformes escolares
              </h1>
              <p className="max-w-2xl text-body text-text-muted">
                A Uniforma moderniza o relacionamento entre governo, escolas, famílias e confecções.
              </p>
              <p className="max-w-2xl text-body text-text-muted">
                Um ecossistema digital confiável que antecipa demandas, reduz erros e fortalece toda
                a cadeia produtiva.
              </p>
            </div>
            <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
              <Link href="/reservas" className={buttonClasses({ className: 'px-lg py-sm' })}>
                Reservar uniforme
              </Link>
              <Link
                href="/sobre"
                className="inline-flex items-center justify-center gap-xs px-lg py-sm text-body font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Conheça como funciona
              </Link>
            </div>
          </div>

          <Card className="flex flex-col gap-sm p-xl">
            <span className="text-caption font-medium uppercase tracking-wide text-primary">
              Por que a Uniforma existe
            </span>
            <p className="text-body text-text">
              Organizar e modernizar a entrega de uniformes escolares significa garantir
              tranquilidade para famílias, previsibilidade para escolas e impacto social real para o
              governo.
            </p>
            <p className="text-body text-text">
              Com dados centralizados e processos auditáveis, a Uniforma cria um fluxo transparente
              que reduz falhas e aproxima quem produz de quem precisa.
            </p>
          </Card>
        </section>

        <section className="grid gap-xl md:grid-cols-2">
          <Card emphasis="muted" className="flex flex-col gap-sm p-xl">
            <h2 className="text-h2 font-heading">🏛️ Confiança institucional</h2>
            <p className="text-body text-text-muted">
              Sistema reconhecido pelo governo, construído com transparência e foco em impacto
              social.
            </p>
            <ul className="flex flex-col gap-xs text-body text-text">
              {governmentPoints.map(point => (
                <li key={point} className="flex items-start gap-sm">
                  <span
                    className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary"
                    aria-hidden
                  />
                  {point}
                </li>
              ))}
            </ul>
          </Card>
          <Card emphasis="muted" className="flex flex-col gap-sm p-xl">
            <h2 className="text-h2 font-heading">Com o apoio do Sindivest</h2>
            <p className="text-body text-text-muted">
              O setor produtivo reforça a importância da plataforma e conecta poder público e
              confecções.
            </p>
            <ul className="flex flex-col gap-xs text-body text-text">
              {industryPoints.map(point => (
                <li key={point} className="flex items-start gap-sm">
                  <span
                    className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-accent"
                    aria-hidden
                  />
                  {point}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section className="flex flex-col gap-lg">
          <div className="flex flex-col gap-xs">
            <span className="text-caption font-medium uppercase tracking-wide text-primary">
              🧵 Valor direto para as confecções
            </span>
            <h2 className="text-h2 font-heading">Empresas de confecção com fluxo previsível</h2>
          </div>
          <div className="grid gap-lg md:grid-cols-3">
            {manufacturerBenefits.map(benefit => (
              <Card key={benefit.title} className="flex flex-col gap-sm p-lg">
                <h3 className="text-h3 font-heading text-primary">{benefit.title}</h3>
                <p className="text-body text-text-muted">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-xl md:grid-cols-2">
          <Card className="flex flex-col gap-sm p-xl">
            <h2 className="text-h2 font-heading">🎒 Para as famílias</h2>
            <ul className="flex flex-col gap-xs text-body text-text">
              {familyBenefits.map(point => (
                <li key={point} className="flex items-start gap-sm">
                  <span
                    className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-accent"
                    aria-hidden
                  />
                  {point}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="flex flex-col gap-sm p-xl">
            <h2 className="text-h2 font-heading">🏫 Para as escolas</h2>
            <ul className="flex flex-col gap-xs text-body text-text">
              {schoolBenefits.map(point => (
                <li key={point} className="flex items-start gap-sm">
                  <span
                    className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary"
                    aria-hidden
                  />
                  {point}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section className="flex flex-col gap-lg">
          <h2 className="text-h2 font-heading">🌱 O impacto final</h2>
          <Card emphasis="muted" className="flex flex-col gap-sm p-xl">
            <p className="text-body text-text">
              Famílias tranquilas → Escolas organizadas → Confecções fortalecidas → Economia local
              aquecida → Governo satisfeito com eficiência e transparência.
            </p>
            <p className="text-body text-text-muted">
              Cada passo na Uniforma cria uma corrente positiva, sustentada por dados e acompanhada
              de perto pelo poder público e pelo setor produtivo.
            </p>
          </Card>
        </section>

        <section className="flex flex-col gap-lg">
          <div className="flex flex-col gap-xs">
            <h2 className="text-h2 font-heading">Como funciona na prática</h2>
            <p className="text-body text-text-muted">
              Quando a reserva começa, o passo-a-passo continua simples.
            </p>
          </div>
          <Card className="flex flex-col gap-md">
            <ul className="flex flex-col gap-sm text-body text-text-muted">
              {[
                'Valide a escola participante do programa.',
                'Escolha o uniforme e confira as opções disponíveis.',
                'Informe as medidas de quem vai usar o uniforme para ajustar os tamanhos.',
                'Confirme a reserva e organize a retirada na loja.',
              ].map((item, index) => (
                <li key={item} className="flex items-start gap-sm">
                  <span className="mt-[2px] flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-caption font-semibold text-primary">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </main>
  );
}
