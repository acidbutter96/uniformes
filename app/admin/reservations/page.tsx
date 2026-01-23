'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import AdminGuard from '@/app/admin/AdminGuard';
import SearchField from '@/app/components/forms/SearchField';
import { Badge } from '@/app/components/ui/Badge';
import { formatCurrency, formatDate } from '@/app/lib/format';
import useAuth from '@/src/hooks/useAuth';
import type { ReservationDTO, ReservationStatus } from '@/src/types/reservation';
import type { SchoolDTO } from '@/src/types/school';
import type { UniformDTO } from '@/src/types/uniform';

const STATUS_TONE: Record<ReservationStatus, 'success' | 'warning' | 'accent'> = {
  aguardando: 'warning',
  recebida: 'accent',
  'em-processamento': 'accent',
  finalizada: 'success',
  entregue: 'success',
  cancelada: 'warning',
  // legacy
  'em-producao': 'accent',
  enviado: 'success',
};

const SUPPLIER_STATUS_OPTIONS = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'recebida', label: 'Recebida' },
  { value: 'em-processamento', label: 'Em processamento' },
  { value: 'finalizada', label: 'Finalizada' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelada', label: 'Cancelada' },
] as const satisfies readonly { value: ReservationStatus; label: string }[];

export default function AdminReservationsPage() {
  const { accessToken, loading: authLoading, user } = useAuth();
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [schools, setSchools] = useState<SchoolDTO[]>([]);
  const [uniforms, setUniforms] = useState<UniformDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(() => new Set());

  const role = typeof user?.role === 'string' ? user.role : null;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const [schoolRes, uniformRes, reservationsRes] = await Promise.all([
          fetch('/api/schools', { cache: 'no-store' }),
          fetch('/api/uniforms', { cache: 'no-store' }),
          fetch('/api/admin/reservations', { headers, cache: 'no-store' }),
        ]);

        const schoolsJson = await schoolRes.json().catch(() => null);
        const uniformsJson = await uniformRes.json().catch(() => null);
        const reservationsJson = await reservationsRes.json().catch(() => null);

        setSchools(schoolsJson?.data ?? []);
        setUniforms(uniformsJson?.data ?? []);
        setReservations(reservationsJson?.data ?? []);
      } catch (error) {
        console.error('Failed to load reservations page data', error);
        setSchools([]);
        setUniforms([]);
        setReservations([]);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      load();
    }
  }, [accessToken, authLoading]);

  const schoolLookup = useMemo(
    () => new Map(schools.map(school => [school.id, school])),
    [schools],
  );
  const uniformLookup = useMemo(
    () => new Map(uniforms.map(uniform => [uniform.id, uniform])),
    [uniforms],
  );

  const resolveSchoolLabel = useCallback(
    (id: string) => {
      const school = schoolLookup.get(id);
      if (!school) {
        return id;
      }
      return `${school.name} — ${school.city}`;
    },
    [schoolLookup],
  );

  const resolveUniformInfo = useCallback(
    (uniformId: string) => {
      const uniform = uniformLookup.get(uniformId);
      if (!uniform) {
        return { uniformLabel: uniformId };
      }

      return {
        uniformLabel: uniform.name,
      };
    },
    [uniformLookup],
  );

  const filteredReservations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reservations;

    return reservations.filter(reservation => {
      const schoolLabel = resolveSchoolLabel(reservation.schoolId).toLowerCase();
      const uniformLabel = resolveUniformInfo(reservation.uniformId).uniformLabel.toLowerCase();
      return (
        reservation.id.toLowerCase().includes(q) ||
        schoolLabel.includes(q) ||
        uniformLabel.includes(q)
      );
    });
  }, [query, reservations, resolveSchoolLabel, resolveUniformInfo]);

  const updateReservationStatus = useCallback(
    async (reservationId: string, status: ReservationStatus) => {
      if (!accessToken) {
        throw new Error('Sem token de acesso.');
      }

      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.add(reservationId);
        return next;
      });

      try {
        const res = await fetch(`/api/admin/reservations/${reservationId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status }),
        });

        const resClone = res.clone();
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const message =
            json?.error ?? `Não foi possível atualizar o status. (HTTP ${res.status})`;
          if (!json?.error) {
            const text = await resClone.text().catch(() => null);
            console.error('Status update failed payload:', { status: res.status, json, text });
          }
          throw new Error(message);
        }

        const updated = (json?.data ?? null) as ReservationDTO | null;
        if (!updated) {
          throw new Error('Resposta inválida ao atualizar status.');
        }

        setReservations(prev => prev.map(r => (r.id === updated.id ? updated : r)));
      } finally {
        setUpdatingIds(prev => {
          const next = new Set(prev);
          next.delete(reservationId);
          return next;
        });
      }
    },
    [accessToken],
  );

  return (
    <AdminGuard requiredRole={['admin', 'supplier']}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900">Reservas</h1>
          <p className="text-sm text-neutral-500">
            Acompanhe o ciclo de vida das reservas e monitore prazos de retirada.
          </p>
        </header>
        <SearchField
          placeholder="Buscar por ID, escola ou uniforme"
          aria-label="Buscar reservas"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                    Carregando reservas...
                  </td>
                </tr>
              ) : filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                    Nenhuma reserva encontrada.
                  </td>
                </tr>
              ) : (
                filteredReservations.map(reservation => {
                  const { uniformLabel } = resolveUniformInfo(reservation.uniformId);
                  const isUpdating = updatingIds.has(reservation.id);
                  const isSupplierWorkflowStatus = SUPPLIER_STATUS_OPTIONS.some(
                    option => option.value === reservation.status,
                  );
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
                        {role === 'supplier' ? (
                          <div className="flex items-center gap-2">
                            <select
                              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400"
                              value={reservation.status}
                              disabled={isUpdating || !accessToken}
                              onChange={async event => {
                                const nextStatus = event.target.value as ReservationStatus;
                                try {
                                  await updateReservationStatus(reservation.id, nextStatus);
                                } catch (error) {
                                  const message =
                                    error instanceof Error ? error.message : 'Falha ao atualizar.';
                                  console.error(message);
                                }
                              }}
                            >
                              {!isSupplierWorkflowStatus ? (
                                <option value={reservation.status} disabled>
                                  {reservation.status.replaceAll('-', ' ')} (legado)
                                </option>
                              ) : null}
                              {SUPPLIER_STATUS_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            {isUpdating ? (
                              <span className="text-xs text-neutral-500">Salvando...</span>
                            ) : (
                              <Badge tone={STATUS_TONE[reservation.status] ?? 'accent'}>
                                {reservation.status.replaceAll('-', ' ')}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge tone={STATUS_TONE[reservation.status] ?? 'accent'}>
                            {reservation.status.replaceAll('-', ' ')}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {formatDate(reservation.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-neutral-800">
                        {formatCurrency(reservation.value ?? 0)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
