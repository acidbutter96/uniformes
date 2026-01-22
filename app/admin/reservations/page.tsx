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
  'em-producao': 'accent',
  enviado: 'success',
  aguardando: 'warning',
};

export default function AdminReservationsPage() {
  const { accessToken, loading: authLoading } = useAuth();
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [schools, setSchools] = useState<SchoolDTO[]>([]);
  const [uniforms, setUniforms] = useState<UniformDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
