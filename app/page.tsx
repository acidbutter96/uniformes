import Link from 'next/link';
import MetricCard from '@/app/components/cards/MetricCard';
import { Button, buttonClasses } from '@/app/components/ui/Button';
import SearchField from '@/app/components/forms/SearchField';
import ProgressSteps from '@/app/components/steps/ProgressSteps';
import { orders } from '@/app/data/orders';
import { schools } from '@/app/data/schools';
import { formatCurrency, formatDate } from '@/app/lib/format';

const totalOrderValue = formatCurrency(orders.reduce((sum, order) => sum + order.value, 0));
const activeSchools = schools.filter(school => school.status === 'ativo').length;
const pendingOrders = orders.filter(order => order.status !== 'enviado').length;

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 rounded-3xl bg-white p-10 shadow-card ring-1 ring-neutral-100 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl space-y-4">
          <h1 className="text-3xl font-semibold text-neutral-900 md:text-4xl">
            Gerencie uniformes escolares com eficiência e transparência.
          </h1>
          <p className="text-base text-neutral-600">
            Centralize pedidos, fornecedores e acompanhamento de produção em um único painel feito
            para equipes escolares modernas.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/dashboard" className={buttonClasses()}>
              Acessar painel
            </Link>
            <Link href="/admin/suppliers" className={buttonClasses({ variant: 'secondary' })}>
              Ver fornecedores
            </Link>
          </div>
        </div>
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-dashed border-brand-200 bg-brand-50/70 p-5 text-sm text-brand-800">
          <p className="font-semibold uppercase tracking-wide text-xs">Próximos passos</p>
          <ProgressSteps
            currentStepId="cadastro"
            steps={[
              {
                id: 'cadastro',
                label: 'Cadastre novas escolas',
                description: 'Importe os dados em CSV',
              },
              {
                id: 'uniformes',
                label: 'Configure uniformes',
                description: 'Tamanhos e precificação',
              },
              {
                id: 'pedidos',
                label: 'Acompanhe pedidos',
                description: 'Status e SLA em tempo real',
              },
              {
                id: 'analise',
                label: 'Analise fornecedores',
                description: 'Defina níveis de serviço',
              },
            ]}
          />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-4">
        <MetricCard
          title="Valor total em pedidos"
          value={totalOrderValue}
          delta="+12% vs. último mês"
          tone="success"
        />
        <MetricCard title="Escolas ativas" value={String(activeSchools)} delta="3 novas escolas" />
        <MetricCard
          title="Pedidos pendentes"
          value={String(pendingOrders)}
          tone="warning"
          delta="Reveja SLA"
        />
        <MetricCard
          title="Lead time médio"
          value="18 dias"
          delta="-4 dias vs. meta"
          tone="success"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-card">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Últimos pedidos</h2>
              <p className="text-sm text-neutral-500">Concilie status e acompanhe entregas</p>
            </div>
            <Button variant="ghost" className="text-sm font-medium text-brand-600">
              Ver todos
            </Button>
          </header>
          <SearchField
            placeholder="Buscar por escola, fornecedor ou ID"
            aria-label="Buscar pedidos"
          />
          <div className="divide-y divide-neutral-100">
            {orders.map(order => (
              <article
                key={order.id}
                className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{order.id}</p>
                  <p className="text-xs text-neutral-500">
                    Atualizado em {formatDate(order.updatedAt)}
                  </p>
                </div>
                <div className="text-sm font-medium text-neutral-700">
                  {formatCurrency(order.value)} — {order.status.replaceAll('-', ' ')}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold text-neutral-900">Atalhos</h2>
          <ul className="space-y-3 text-sm">
            <li>
              <Link
                href="/admin/schools"
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:border-brand-200 hover:text-brand-600"
              >
                Gerenciar escolas
                <span aria-hidden>→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/uniforms"
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:border-brand-200 hover:text-brand-600"
              >
                Catálogo de uniformes
                <span aria-hidden>→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/orders"
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:border-brand-200 hover:text-brand-600"
              >
                Acompanhar pedidos
                <span aria-hidden>→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/suppliers"
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 hover:border-brand-200 hover:text-brand-600"
              >
                Relacionamento com fornecedores
                <span aria-hidden>→</span>
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
