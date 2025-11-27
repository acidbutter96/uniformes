import { schools } from '@/app/data/schools';
import { Badge } from '@/app/components/ui/Badge';

const statusTone: Record<string, 'success' | 'warning' | 'danger'> = {
  ativo: 'success',
  pendente: 'warning',
  inativo: 'danger',
};

export default function AdminSchoolsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Escolas</h1>
        <p className="text-sm text-neutral-500">
          Visualize cadastros e acompanhe o status de integração.
        </p>
      </header>
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
        <table className="min-w-full divide-y divide-neutral-100 text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3">Alunos</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {schools.map(school => (
              <tr key={school.id} className="hover:bg-brand-50/40">
                <td className="px-4 py-3 font-medium text-neutral-900">{school.name}</td>
                <td className="px-4 py-3 text-neutral-600">{school.city}</td>
                <td className="px-4 py-3 text-neutral-600">{school.students}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[school.status]}>{school.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
