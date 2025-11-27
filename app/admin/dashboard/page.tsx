import MetricCard from '@/app/components/cards/MetricCard';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { orders } from '@/app/data/orders';
import { schools } from '@/app/data/schools';
import { formatCurrency, formatDate } from '@/app/lib/format';

const totalOrders = orders.length;
const awaitingOrders = orders.filter(order => order.status === 'aguardando').length;
const totalValue = orders.reduce((sum, order) => sum + order.value, 0);
const activeSchools = schools.filter(school => school.status === 'ativo').length;

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            Administração
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-neutral-900">Visão geral</h1>
          <p className="text-sm text-neutral-500">
            Monitoramento de pedidos, fornecedores e escolas integradas.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">Exportar dados</Button>
          <Button>Criar pedido</Button>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-4">
        <MetricCard
          title="Valor total"
          value={formatCurrency(totalValue)}
          tone="success"
          delta="+18% vs. mês anterior"
        />
        <MetricCard
          title="Pedidos ativos"
          value={String(totalOrders)}
          delta={`${awaitingOrders} aguardando ação`}
          tone="warning"
        />
        <MetricCard title="Escolas ativas" value={String(activeSchools)} delta="Meta: 50 escolas" />
        <MetricCard title="SLA médio" value="92%" delta="+3% vs. meta" tone="success" />
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-card">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Fluxo de pedidos</h2>
          <Button variant="ghost" className="text-sm font-medium text-brand-600">
            Ver relatório completo
          </Button>
        </header>
        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-100">
          <table className="min-w-full divide-y divide-neutral-100 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Escola</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Atualizado em</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3 font-medium text-neutral-900">{order.id}</td>
                  <td className="px-4 py-3 text-neutral-600">{order.schoolId}</td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        order.status === 'enviado'
                          ? 'success'
                          : order.status === 'aguardando'
                            ? 'warning'
                            : 'accent'
                      }
                    >
                      {order.status.replaceAll('-', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(order.updatedAt)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-800">
                    {formatCurrency(order.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
