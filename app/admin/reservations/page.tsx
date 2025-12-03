import AdminGuard from '@/app/admin/AdminGuard';
import SearchField from '@/app/components/forms/SearchField';
import { Badge } from '@/app/components/ui/Badge';
import { formatCurrency, formatDate } from '@/app/lib/format';
import { listReservations } from '@/src/services/reservation.service';
import { listSchools } from '@/src/services/school.service';
import { listUniforms } from '@/src/services/uniform.service';
import type { ReservationStatus } from '@/src/types/reservation';

const STATUS_TONE: Record<ReservationStatus, 'success' | 'warning' | 'accent'> = {
  'em-producao': 'accent',
  enviado: 'success',
  aguardando: 'warning',
};

export default async function AdminReservationsPage() {
  const [reservations, schools, uniforms] = await Promise.all([
    listReservations(),
    listSchools(),
    listUniforms(),
  ]);

  const schoolLookup = new Map(schools.map(school => [school.id, school]));
  const uniformLookup = new Map(uniforms.map(uniform => [uniform.id, uniform]));
  const resolveSchoolLabel = (id: string) => {
    const school = schoolLookup.get(id);
    if (!school) {
      return id;
    }
    return `${school.name} — ${school.city}`;
  };

  const resolveUniformInfo = (uniformId: string) => {
    const uniform = uniformLookup.get(uniformId);
    if (!uniform) {
      return { uniformLabel: uniformId };
    }

    return {
      uniformLabel: uniform.name,
    };
  };

  return (
    <AdminGuard requiredRole="admin">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900">Reservas</h1>
          <p className="text-sm text-neutral-500">
            Acompanhe o ciclo de vida das reservas e monitore prazos de retirada.
          </p>
        </header>
        <SearchField placeholder="Buscar por ID, escola ou uniforme" aria-label="Buscar reservas" />
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-neutral-100 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Reserva</th>
                <th className="px-4 py-3">Escola</th>
                <th className="px-4 py-3">Uniforme</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Atualizado em</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {reservations.map(reservation => {
                const { uniformLabel } = resolveUniformInfo(reservation.uniformId);
                return (
                  <tr key={reservation.id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3 font-medium text-neutral-900">{reservation.id}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {resolveSchoolLabel(reservation.schoolId)}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      <div className="flex flex-col">
                        <span>{uniformLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[reservation.status] ?? 'accent'}>
                        {reservation.status.replaceAll('-', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {formatDate(reservation.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-neutral-800">
                      {formatCurrency(reservation.value ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
