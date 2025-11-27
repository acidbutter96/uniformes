import { suppliers } from '@/app/data/suppliers';
import { formatCurrency } from '@/app/lib/format';

export default function AdminSuppliersPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Fornecedores</h1>
        <p className="text-sm text-neutral-500">
          Gerencie os parceiros responsáveis pela produção e logística.
        </p>
      </header>
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
        <table className="min-w-full divide-y divide-neutral-100 text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Especialidade</th>
              <th className="px-4 py-3">Lead time (dias)</th>
              <th className="px-4 py-3">Avaliação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {suppliers.map(supplier => (
              <tr key={supplier.id} className="hover:bg-brand-50/40">
                <td className="px-4 py-3 font-medium text-neutral-900">{supplier.name}</td>
                <td className="px-4 py-3 text-neutral-600">{supplier.specialty}</td>
                <td className="px-4 py-3 text-neutral-600">{supplier.leadTimeDays}</td>
                <td className="px-4 py-3 text-neutral-600">{supplier.rating.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/70 p-6 text-sm text-brand-800">
        <h2 className="text-base font-semibold text-brand-600">Sugestão rápida</h2>
        <p className="mt-2">
          Configure SLA mínimo e faixas de preço para priorizar fornecedores de maior qualidade.
          Valores estimados podem ser definidos a partir de {formatCurrency(25000)} por trimestre.
        </p>
      </section>
    </div>
  );
}
