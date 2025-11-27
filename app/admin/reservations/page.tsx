import AdminGuard from '@/app/admin/AdminGuard';
import { reservations } from '@/app/data/reservations';
import { formatCurrency, formatDate } from '@/app/lib/format';
import SearchField from '@/app/components/forms/SearchField';
import { Badge } from '@/app/components/ui/Badge';

const statusTone: Record<string, 'success' | 'warning' | 'accent'> = {
  'em-producao': 'accent',
  enviado: 'success',
  aguardando: 'warning',
};

export default function AdminReservationsPage() {
  return (
    <AdminGuard requiredRole="admin">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900">Reservas</h1>
          <p className="text-sm text-neutral-500">
            Acompanhe o ciclo de vida das reservas e monitore prazos de retirada.
          </p>
        </header>
        <SearchField
          placeholder="Buscar por ID, escola ou fornecedor"
          aria-label="Buscar reservas"
        />
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-neutral-100 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Reserva</th>
                <th className="px-4 py-3">Escola</th>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Atualizado em</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {reservations.map(reservation => (
                <tr key={reservation.id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3 font-medium text-neutral-900">{reservation.id}</td>
                  <td className="px-4 py-3 text-neutral-600">{reservation.schoolId}</td>
                  <td className="px-4 py-3 text-neutral-600">{reservation.supplierId}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[reservation.status]}>
                      {reservation.status.replaceAll('-', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {formatDate(reservation.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-800">
                    {formatCurrency(reservation.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
