'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '@/app/admin/AdminGuard';
import MetricCard from '@/app/components/cards/MetricCard';
import Link from 'next/link';
import { Button, buttonClasses } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Input } from '@/app/components/ui/Input';
import { Modal, ModalFooter } from '@/app/components/ui/Modal';
import { formatCurrency, formatDate } from '@/app/lib/format';
import DashboardCharts from '@/app/components/dashboard/DashboardCharts';
import useAuth from '@/src/hooks/useAuth';
import type { ReservationStatus, ReservationDTO } from '@/src/types/reservation';
import type { SchoolDTO } from '@/src/types/school';
import {
  downloadBlob,
  generateReservationsFlowPdf,
  toCsv,
  type ExportFormat,
} from '@/app/lib/exports';

type DashboardAnalyticsPayload = {
  dashboardChartsEnabled: boolean;
  rangeDays: number;
  rangeUnit?: 'days' | 'hours';
  rangeValue?: number;
  bucketUnit?: 'day' | 'hour';
  cfd: Array<Record<string, unknown>>;
  throughput: Array<{ date: string; entregues: number; canceladas: number }>;
  cycleTime: Array<{ date: string; count: number; medianDays: number; p90Days: number }>;
  agingWip: Array<{ bucket: string; count: number }>;
  staleByStatus: Array<{ status: ReservationStatus; count: number }>;
};

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
  const [exportOpen, setExportOpen] = useState(false);
  const [dashboardChartsEnabled, setDashboardChartsEnabled] = useState(false);
  const [analytics, setAnalytics] = useState<DashboardAnalyticsPayload | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [rangePresetDays, setRangePresetDays] = useState(7);
  const [rangePresetHours, setRangePresetHours] = useState(24);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [analyticsQuery, setAnalyticsQuery] = useState('days=7');
  const [chartsFiltersOpen, setChartsFiltersOpen] = useState(false);
  const [draftRangePresetDays, setDraftRangePresetDays] = useState(7);
  const [draftRangePresetHours, setDraftRangePresetHours] = useState(24);
  const [draftRangeFrom, setDraftRangeFrom] = useState('');
  const [draftRangeTo, setDraftRangeTo] = useState('');
  const [draftRangeUnit, setDraftRangeUnit] = useState<'days' | 'hours'>('days');
  const [loading, setLoading] = useState(true);

  const role = typeof user?.role === 'string' ? user.role : null;

  const companyName = (() => {
    const supplierName =
      role === 'supplier' &&
      user &&
      typeof (user as { supplier?: { name?: unknown } }).supplier?.name === 'string'
        ? String((user as { supplier?: { name?: string } }).supplier?.name)
        : null;
    if (supplierName) return supplierName;

    const fromEnv =
      typeof process !== 'undefined' && typeof process.env.NEXT_PUBLIC_COMPANY_NAME === 'string'
        ? process.env.NEXT_PUBLIC_COMPANY_NAME
        : null;
    return fromEnv?.trim() || 'Uniformes';
  })();

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

  useEffect(() => {
    async function loadAnalytics() {
      setAnalyticsLoading(true);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        const analyticsRes = await fetch(`/api/admin/dashboard/analytics?${analyticsQuery}`, {
          headers,
          cache: 'no-store',
        });

        const analyticsJson: unknown = await analyticsRes.json().catch(() => null);
        const rawData =
          analyticsJson && typeof analyticsJson === 'object' && 'data' in analyticsJson
            ? (analyticsJson as { data?: unknown }).data
            : null;
        const payload = (rawData ?? null) as DashboardAnalyticsPayload | null;
        const enabled = Boolean(payload?.dashboardChartsEnabled);
        setDashboardChartsEnabled(enabled);
        setAnalytics(enabled ? payload : null);
      } catch (err) {
        console.error('Failed to load dashboard analytics', err);
        setDashboardChartsEnabled(false);
        setAnalytics(null);
      } finally {
        setAnalyticsLoading(false);
      }
    }

    if (!authLoading) {
      loadAnalytics();
    }
  }, [accessToken, authLoading, analyticsQuery]);

  useEffect(() => {
    if (!chartsFiltersOpen) return;
    setDraftRangePresetDays(rangePresetDays);
    setDraftRangePresetHours(rangePresetHours);
    setDraftRangeFrom(rangeFrom);
    setDraftRangeTo(rangeTo);

    if (analyticsQuery.startsWith('hours=')) {
      setDraftRangeUnit('hours');
    } else {
      setDraftRangeUnit('days');
    }
  }, [chartsFiltersOpen, analyticsQuery, rangeFrom, rangePresetDays, rangePresetHours, rangeTo]);

  const resetDraftRange = () => {
    setDraftRangeFrom('');
    setDraftRangeTo('');
    setDraftRangePresetDays(7);
    setDraftRangePresetHours(24);
    setDraftRangeUnit('days');
  };

  const applyDraftRange = () => {
    setRangeFrom(draftRangeFrom);
    setRangeTo(draftRangeTo);
    setRangePresetDays(draftRangePresetDays);
    setRangePresetHours(draftRangePresetHours);

    const hasCustom = Boolean(draftRangeFrom && draftRangeTo);
    if (hasCustom) {
      const wantsHourBucket = Boolean(draftRangeFrom.includes('T') || draftRangeTo.includes('T'));
      setAnalyticsQuery(
        `from=${encodeURIComponent(draftRangeFrom)}&to=${encodeURIComponent(draftRangeTo)}${
          wantsHourBucket ? '&bucket=hour' : ''
        }`,
      );
      return;
    }

    if (draftRangeUnit === 'hours') {
      setAnalyticsQuery(`hours=${encodeURIComponent(String(draftRangePresetHours))}`);
      return;
    }

    setAnalyticsQuery(`days=${encodeURIComponent(String(draftRangePresetDays))}`);
  };

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

  const emittedAtLabel = (() => {
    const now = new Date();
    const pad2 = (value: number) => String(value).padStart(2, '0');
    return `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()} - ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  })();

  const chartsRangeLabel = (() => {
    if (rangeFrom && rangeTo) {
      return `${rangeFrom.replace('T', ' ')} → ${rangeTo.replace('T', ' ')}`;
    }
    if (analyticsQuery.startsWith('hours=')) {
      return `Últimas ${rangePresetHours}h`;
    }
    return `Últimos ${rangePresetDays} dias`;
  })();

  const formatMeasurements = (measurements: ReservationDTO['measurements'] | undefined) => {
    if (!measurements || typeof measurements !== 'object') return '';
    const m = measurements as Partial<Record<'height' | 'chest' | 'waist' | 'hips', number>>;

    const parts: string[] = [];
    const pushIf = (label: string, value: unknown) => {
      const n = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(n) || n <= 0) return;
      parts.push(`${label}: ${n}`);
    };

    pushIf('Alt', m.height);
    pushIf('Peito', m.chest);
    pushIf('Cint', m.waist);
    pushIf('Quadril', m.hips);

    return parts.join(' | ');
  };

  const exportReservationsFlow = async (format: ExportFormat) => {
    const rows = reservations.map(r => {
      const school = schoolLookup.get(r.schoolId);
      return {
        id: r.id,
        responsavel: r.userName,
        aluno:
          typeof r.childName === 'string' && r.childName.trim()
            ? r.childName.trim()
            : 'Aluno não identificado',
        escola: school?.name ?? r.schoolId,
        cidade: school?.city ?? '',
        status: r.status,
        atualizadoEm: r.updatedAt,
        medidas: formatMeasurements(r.measurements),
        tamanho: r.suggestedSize,
        valor: r.value ?? 0,
      };
    });

    const total = rows.reduce((sum, row) => sum + (Number(row.valor) || 0), 0);

    const filenameBase = `fluxo-reservas_${new Date().toISOString().replaceAll(':', '-')}`;

    if (format === 'json') {
      const payload = {
        emittedAt: new Date().toISOString(),
        count: rows.length,
        total,
        rows,
      };
      downloadBlob({
        blob: new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
        filename: `${filenameBase}.json`,
      });
      return;
    }

    if (format === 'csv') {
      const headers = [
        'id',
        'responsavel',
        'aluno',
        'escola',
        'cidade',
        'status',
        'atualizadoEm',
        'medidas',
        'tamanho',
        'valor',
      ];
      const csv = toCsv({
        headers,
        rows: rows.map(r => [
          r.id,
          r.responsavel,
          r.aluno,
          r.escola,
          r.cidade,
          r.status,
          r.atualizadoEm,
          r.medidas,
          r.tamanho,
          r.valor,
        ]),
      });
      downloadBlob({
        blob: new Blob([csv], { type: 'text/csv;charset=utf-8' }),
        filename: `${filenameBase}.csv`,
      });
      return;
    }

    const pdfBytes = await generateReservationsFlowPdf({
      title: 'Relatório — Fluxo de reservas',
      companyName,
      emittedAtLabel,
      logoUrl: '/images/logo.png',
      orientation: 'landscape',
      columnAlign: ['left', 'left', 'left', 'left', 'left', 'left', 'right'],
      headers: ['Responsável', 'Aluno', 'Escola', 'Status', 'Atualizado', 'Medidas', 'Valor'],
      rows: [
        ...rows.map(r => [
          r.responsavel,
          r.aluno,
          r.escola,
          String(r.status).replaceAll('-', ' '),
          formatDate(r.atualizadoEm),
          r.medidas,
          formatCurrency(r.valor),
        ]),
        ['', '', '', '', '', 'TOTAL', formatCurrency(total)],
      ],
      boldRowIndexes: [rows.length],
    });

    downloadBlob({
      blob: new Blob([pdfBytes], { type: 'application/pdf' }),
      filename: `${filenameBase}.pdf`,
    });
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
          <div className="relative flex flex-wrap gap-3">
            <div className="relative">
              <Button
                variant="secondary"
                onClick={() => setExportOpen(prev => !prev)}
                aria-expanded={exportOpen}
              >
                Exportar dados
              </Button>
              {exportOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
                    onClick={async () => {
                      setExportOpen(false);
                      await exportReservationsFlow('csv');
                    }}
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
                    onClick={async () => {
                      setExportOpen(false);
                      await exportReservationsFlow('json');
                    }}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
                    onClick={async () => {
                      setExportOpen(false);
                      await exportReservationsFlow('pdf');
                    }}
                  >
                    PDF
                  </button>
                </div>
              ) : null}
            </div>
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

        {analyticsLoading || dashboardChartsEnabled ? (
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Séries temporais</h2>
                <p className="text-sm text-neutral-500">
                  Selecione um range e use o brush para percorrer o período.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Badge tone="accent">{chartsRangeLabel}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChartsFiltersOpen(true)}
                  disabled={analyticsLoading}
                >
                  Filtros
                </Button>
              </div>
            </div>

            <div className="mt-6">
              {dashboardChartsEnabled && analytics ? (
                <DashboardCharts
                  rangeDays={Number(analytics.rangeDays) || 30}
                  rangeUnit={analytics.rangeUnit}
                  rangeValue={analytics.rangeValue}
                  bucketUnit={analytics.bucketUnit}
                  cfd={analytics.cfd}
                  throughput={analytics.throughput}
                  cycleTime={analytics.cycleTime}
                  agingWip={analytics.agingWip}
                  staleByStatus={analytics.staleByStatus}
                />
              ) : (
                <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-6 text-sm text-neutral-600">
                  {analyticsLoading
                    ? 'Carregando analytics…'
                    : 'Sem dados para o período selecionado.'}
                </div>
              )}
            </div>
          </section>
        ) : null}

        <Modal
          open={chartsFiltersOpen}
          onClose={() => setChartsFiltersOpen(false)}
          title="Filtros dos charts"
          description="Aplique um range de tempo para atualizar as séries temporais."
          size="lg"
          footer={
            <ModalFooter>
              <Button variant="ghost" onClick={() => setChartsFiltersOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  applyDraftRange();
                  setChartsFiltersOpen(false);
                }}
                disabled={
                  analyticsLoading ||
                  Boolean(draftRangeFrom && !draftRangeTo) ||
                  Boolean(!draftRangeFrom && draftRangeTo)
                }
              >
                Confirmar
              </Button>
            </ModalFooter>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={
                  draftRangeUnit === 'hours' && draftRangePresetHours === 1
                    ? 'secondary'
                    : 'outline'
                }
                size="sm"
                onClick={() => {
                  setDraftRangeFrom('');
                  setDraftRangeTo('');
                  setDraftRangeUnit('hours');
                  setDraftRangePresetHours(1);
                }}
                disabled={analyticsLoading}
              >
                1h
              </Button>
              <Button
                variant={
                  draftRangeUnit === 'hours' && draftRangePresetHours === 6
                    ? 'secondary'
                    : 'outline'
                }
                size="sm"
                onClick={() => {
                  setDraftRangeFrom('');
                  setDraftRangeTo('');
                  setDraftRangeUnit('hours');
                  setDraftRangePresetHours(6);
                }}
                disabled={analyticsLoading}
              >
                6h
              </Button>
              <Button
                variant={
                  draftRangeUnit === 'hours' && draftRangePresetHours === 12
                    ? 'secondary'
                    : 'outline'
                }
                size="sm"
                onClick={() => {
                  setDraftRangeFrom('');
                  setDraftRangeTo('');
                  setDraftRangeUnit('hours');
                  setDraftRangePresetHours(12);
                }}
                disabled={analyticsLoading}
              >
                12h
              </Button>
              <Button
                variant={
                  draftRangeUnit === 'hours' && draftRangePresetHours === 24
                    ? 'secondary'
                    : 'outline'
                }
                size="sm"
                onClick={() => {
                  setDraftRangeFrom('');
                  setDraftRangeTo('');
                  setDraftRangeUnit('hours');
                  setDraftRangePresetHours(24);
                }}
                disabled={analyticsLoading}
              >
                24h
              </Button>
              <span className="mx-1 h-6 w-px bg-neutral-200" />
              <Button
                variant={
                  draftRangeUnit === 'days' && draftRangePresetDays === 7 ? 'secondary' : 'outline'
                }
                size="sm"
                onClick={() => {
                  setDraftRangeFrom('');
                  setDraftRangeTo('');
                  setDraftRangeUnit('days');
                  setDraftRangePresetDays(7);
                }}
                disabled={analyticsLoading}
              >
                Semana
              </Button>
              <Button
                variant={
                  draftRangeUnit === 'days' && draftRangePresetDays === 30 ? 'secondary' : 'outline'
                }
                size="sm"
                onClick={() => {
                  setDraftRangeFrom('');
                  setDraftRangeTo('');
                  setDraftRangeUnit('days');
                  setDraftRangePresetDays(30);
                }}
                disabled={analyticsLoading}
              >
                Mês
              </Button>
              <Button
                variant={
                  draftRangeUnit === 'days' && draftRangePresetDays === 90 ? 'secondary' : 'outline'
                }
                size="sm"
                onClick={() => {
                  setDraftRangeFrom('');
                  setDraftRangeTo('');
                  setDraftRangeUnit('days');
                  setDraftRangePresetDays(90);
                }}
                disabled={analyticsLoading}
              >
                Trimestre
              </Button>
              <Button
                variant={
                  draftRangeUnit === 'days' && draftRangePresetDays === 365
                    ? 'secondary'
                    : 'outline'
                }
                size="sm"
                onClick={() => {
                  setDraftRangeFrom('');
                  setDraftRangeTo('');
                  setDraftRangeUnit('days');
                  setDraftRangePresetDays(365);
                }}
                disabled={analyticsLoading}
              >
                Ano
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetDraftRange}
                disabled={analyticsLoading}
              >
                Reset
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex w-full flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Range (horas)
                <select
                  className="w-full rounded-card border border-border bg-surface px-md py-sm text-body text-text shadow-sm transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
                  value={draftRangePresetHours}
                  onChange={e => {
                    setDraftRangeUnit('hours');
                    setDraftRangePresetHours(Number(e.target.value) || 24);
                  }}
                  disabled={Boolean(draftRangeFrom && draftRangeTo)}
                >
                  <option value={1}>1</option>
                  <option value={3}>3</option>
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                  <option value={72}>72</option>
                  <option value={168}>168</option>
                </select>
              </label>

              <label className="flex w-full flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Range (dias)
                <select
                  className="w-full rounded-card border border-border bg-surface px-md py-sm text-body text-text shadow-sm transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
                  value={draftRangePresetDays}
                  onChange={e => {
                    setDraftRangeUnit('days');
                    setDraftRangePresetDays(Number(e.target.value) || 7);
                  }}
                  disabled={Boolean(draftRangeFrom && draftRangeTo)}
                >
                  <option value={7}>7</option>
                  <option value={14}>14</option>
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                  <option value={90}>90</option>
                  <option value={180}>180</option>
                  <option value={365}>365</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex w-full flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                De (data/hora)
                <Input
                  type="datetime-local"
                  value={draftRangeFrom}
                  onChange={e => setDraftRangeFrom(e.target.value)}
                />
              </label>

              <label className="flex w-full flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Até (data/hora)
                <Input
                  type="datetime-local"
                  value={draftRangeTo}
                  onChange={e => setDraftRangeTo(e.target.value)}
                />
              </label>
            </div>

            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-sm text-neutral-600">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-neutral-800">Prévia:</span>
                <span>
                  {draftRangeFrom && draftRangeTo
                    ? `${draftRangeFrom.replace('T', ' ')} → ${draftRangeTo.replace('T', ' ')}`
                    : draftRangeUnit === 'hours'
                      ? `Últimas ${draftRangePresetHours}h`
                      : `Últimos ${draftRangePresetDays} dias`}
                </span>
              </div>
            </div>
          </div>
        </Modal>

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
