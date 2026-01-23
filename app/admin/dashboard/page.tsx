'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '@/app/admin/AdminGuard';
import MetricCard from '@/app/components/cards/MetricCard';
import Link from 'next/link';
import { Button, buttonClasses } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { formatCurrency, formatDate } from '@/app/lib/format';
import useAuth from '@/src/hooks/useAuth';
import type { ReservationStatus, ReservationDTO } from '@/src/types/reservation';
import type { SchoolDTO } from '@/src/types/school';

const STATUS_TONE: Record<ReservationStatus, 'success' | 'warning' | 'accent'> = {
  aguardando: 'warning',
  recebida: 'accent',
  'em-processamento': 'accent',
  finalizada: 'success',
  entregue: 'success',
  cancelada: 'warning',
  // legacy
  enviado: 'success',
  'em-producao': 'accent',
};

export default function AdminDashboardPage() {
  const { accessToken, loading: authLoading, user } = useAuth();
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [schools, setSchools] = useState<SchoolDTO[]>([]);
  const [supplierSchoolIds, setSupplierSchoolIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const role = typeof user?.role === 'string' ? user.role : null;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const schoolRes = await fetch('/api/schools', { cache: 'no-store' });
        const schoolJson = await schoolRes.json().catch(() => null);
        const schoolsData = schoolJson?.data ?? [];

        // fetch reservations via admin endpoint; server will filter by token role
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        const resRes = await fetch('/api/admin/reservations', {
          headers,
          cache: 'no-store',
        });
        const resJson = await resRes.json().catch(() => null);
        const reservationsData = resJson?.data ?? [];

        let supplierSchoolIdsData: string[] = [];
        if (role === 'supplier') {
          const supplierSchoolsRes = await fetch('/api/suppliers/me/schools', {
            headers,
            cache: 'no-store',
          });
          const supplierSchoolsJson = await supplierSchoolsRes.json().catch(() => null);
          supplierSchoolIdsData = supplierSchoolsJson?.data?.schoolIds ?? [];
        }

        setSchools(schoolsData);
        setReservations(reservationsData);
        setSupplierSchoolIds(supplierSchoolIdsData);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        setSchools([]);
        setReservations([]);
        setSupplierSchoolIds([]);
      } finally {
        setLoading(false);
      }
    }

    // wait for auth to finish loading so we have accessToken when needed
    if (!authLoading) {
      load();
    }
  }, [accessToken, authLoading, role]);

  const totalReservations = reservations.length;
  const awaitingReservations = reservations.filter(
    reservation => reservation.status === 'aguardando',
  ).length;
  const totalValue = reservations.reduce((sum, reservation) => sum + (reservation.value ?? 0), 0);
  const activeSchools = schools.filter((school: SchoolDTO) => school.status === 'ativo').length;

  const supplierSchoolsCount = supplierSchoolIds.length;
  const activeSupplierSchools = schools.filter(
    (school: SchoolDTO) =>
      school.status === 'ativo' && supplierSchoolIds.includes(String(school.id ?? '')),
  ).length;
  const schoolLookup = new Map(schools.map((school: SchoolDTO) => [school.id, school]));

  const resolveSchoolLabel = (id: string) => {
    const school = schoolLookup.get(id);
    if (!school) {
      return id;
    }
    return `${school.name} — ${school.city}`;
  };

  return (
    <AdminGuard requiredRole={['admin', 'supplier']}>
      <div className="space-y-8">
        <header className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              {role === 'supplier' ? 'Fornecedor' : 'Administração'}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-900">Visão geral</h1>
            <p className="text-sm text-neutral-500">
              {role === 'supplier'
                ? 'Monitoramento das suas reservas e escolas atendidas.'
                : 'Monitoramento de reservas, fornecedores e escolas integradas.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary">Exportar dados</Button>
            {role === 'admin' && (
              <Link href="/admin/invites" className={buttonClasses({ size: 'md' })}>
                Convites fornecedores
              </Link>
            )}
            {role === 'supplier' && (
              <Link href="/admin/escolas-atendidas" className={buttonClasses({ size: 'md' })}>
                Escolas atendidas
              </Link>
            )}
            {role === 'admin' && (
              <Link
                href="/admin/settings"
                className={buttonClasses({ size: 'md', variant: 'ghost' })}
              >
                Configurações
              </Link>
            )}
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
            title="Reservas ativas"
            value={String(totalReservations)}
            delta={`${awaitingReservations} aguardando ação`}
            tone="warning"
          />
          {role === 'supplier' ? (
            <MetricCard
              title="Escolas atendidas"
              value={String(supplierSchoolsCount)}
              delta={`${activeSupplierSchools} ativas`}
            />
          ) : (
            <MetricCard
              title="Escolas ativas"
              value={String(activeSchools)}
              delta="Meta: 50 escolas"
            />
          )}
          <MetricCard title="SLA médio" value="92%" delta="+3% vs. meta" tone="success" />
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-card">
          <header className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">Fluxo de reservas</h2>
            <Button variant="ghost" className="text-sm font-medium text-brand-600">
              Ver relatório completo
            </Button>
          </header>
          <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-100">
            <table className="min-w-full divide-y divide-neutral-100 text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Reserva</th>
                  <th className="px-4 py-3">Escola</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Atualizado em</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                      Carregando reservas...
                    </td>
                  </tr>
                ) : (
                  reservations.map((reservation: ReservationDTO) => (
                    <tr key={reservation.id} className="hover:bg-brand-50/40">
                      <td className="px-4 py-3 font-medium text-neutral-900">{reservation.id}</td>
                      <td className="px-4 py-3 text-neutral-600">
                        {resolveSchoolLabel(reservation.schoolId)}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminGuard>
  );
}
