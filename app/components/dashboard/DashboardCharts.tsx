'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card } from '@/app/components/ui/Card';
import type { ReservationStatus } from '@/src/types/reservation';

type CFDPoint = Record<string, unknown>;

type ThroughputPoint = {
  date: string;
  entregues: number;
  canceladas: number;
};

type CycleTimePoint = {
  date: string;
  count: number;
  medianDays: number;
  p90Days: number;
};

type AgingPoint = {
  bucket: string;
  count: number;
};

type Props = {
  rangeUnit?: 'days' | 'hours';
  rangeValue?: number;
  bucketUnit?: 'day' | 'hour';
  rangeDays: number;
  cfd: CFDPoint[];
  throughput: ThroughputPoint[];
  cycleTime: CycleTimePoint[];
  agingWip: AgingPoint[];
  staleByStatus: Array<{ status: ReservationStatus; count: number }>;
};

const STATUS_LABEL: Record<string, string> = {
  aguardando: 'Aguardando',
  recebida: 'Recebida',
  'em-processamento': 'Em processamento',
  finalizada: 'Finalizada',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  aguardando: '#F59E0B',
  recebida: '#7C3AED',
  'em-processamento': '#3B82F6',
  finalizada: '#10B981',
  entregue: '#059669',
  cancelada: '#EF4444',
};

const CFD_ORDER: Array<ReservationStatus> = [
  'aguardando',
  'recebida',
  'em-processamento',
  'finalizada',
  'entregue',
  'cancelada',
];

function axisTickFormatter(value: unknown) {
  if (typeof value !== 'string') return '';
  // Hour key: YYYY-MM-DDTHH:00Z
  if (value.includes('T')) {
    const [datePart, timePart] = value.split('T');
    const parts = datePart?.split('-') ?? [];
    const hour = (timePart ?? '').slice(0, 2);
    if (parts.length === 3 && hour) return `${parts[1]}-${parts[2]} ${hour}h`;
    return value;
  }

  // Day key: YYYY-MM-DD
  const parts = value.split('-');
  if (parts.length === 3) return `${parts[1]}-${parts[2]}`;
  return value;
}

function tooltipLabelFormatter(value: unknown) {
  if (typeof value !== 'string') return '';
  return value;
}

export default function DashboardCharts({
  rangeUnit,
  rangeValue,
  rangeDays,
  cfd,
  throughput,
  cycleTime,
  agingWip,
  staleByStatus,
}: Props) {
  const effectiveUnit = rangeUnit ?? 'days';
  const effectiveValue =
    typeof rangeValue === 'number' && Number.isFinite(rangeValue) && rangeValue > 0
      ? Math.floor(rangeValue)
      : rangeDays;
  const label =
    effectiveUnit === 'hours' ? `últimas ${effectiveValue} horas` : `últimos ${rangeDays} dias`;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-neutral-900">Operação ({label})</h2>
        <p className="text-sm text-neutral-500">
          Gráficos construídos a partir do histórico de eventos (criação, mudança de status e
          cancelamento).
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-card">
          <h3 className="text-sm font-semibold text-neutral-900">
            Cumulative Flow (WIP por status)
          </h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={cfd}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                syncId="dashboard"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tickFormatter={axisTickFormatter} fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip labelFormatter={tooltipLabelFormatter} />
                <Legend />
                {CFD_ORDER.map(status => (
                  <Area
                    key={status}
                    type="monotone"
                    dataKey={status}
                    stackId="1"
                    name={STATUS_LABEL[status] ?? status}
                    stroke={STATUS_COLORS[status] ?? '#111827'}
                    fill={STATUS_COLORS[status] ?? '#111827'}
                    fillOpacity={0.22}
                  />
                ))}
                <Brush
                  dataKey="date"
                  height={26}
                  travellerWidth={12}
                  stroke="#D1D5DB"
                  tickFormatter={axisTickFormatter}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Se alguma faixa cresce sem reduzir, há acúmulo/gargalo naquele status.
          </p>
        </Card>

        <Card className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-card">
          <h3 className="text-sm font-semibold text-neutral-900">
            Throughput (entregues/canceladas)
          </h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={throughput}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                syncId="dashboard"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tickFormatter={axisTickFormatter} fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip labelFormatter={tooltipLabelFormatter} />
                <Legend />
                <Bar dataKey="entregues" name="Entregues" fill={STATUS_COLORS.entregue} />
                <Bar dataKey="canceladas" name="Canceladas" fill={STATUS_COLORS.cancelada} />
                <Brush
                  dataKey="date"
                  height={26}
                  travellerWidth={12}
                  stroke="#D1D5DB"
                  tickFormatter={axisTickFormatter}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-card">
          <h3 className="text-sm font-semibold text-neutral-900">Cycle time (dias)</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={cycleTime}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                syncId="dashboard"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tickFormatter={axisTickFormatter} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip labelFormatter={tooltipLabelFormatter} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="medianDays"
                  name="Mediana"
                  stroke="#111827"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="p90Days"
                  name="P90"
                  stroke="#6B7280"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
                <Brush
                  dataKey="date"
                  height={26}
                  travellerWidth={12}
                  stroke="#D1D5DB"
                  tickFormatter={axisTickFormatter}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Calculado como criação → entrada em entregue, agrupado por dia de entrega.
          </p>
        </Card>

        <Card className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-card">
          <h3 className="text-sm font-semibold text-neutral-900">
            Aging WIP (idade do WIP aberto)
          </h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingWip} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="bucket" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Pedidos abertos" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Distribuição por status (abertos)
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {staleByStatus.map(item => (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-xl bg-white px-3 py-2"
                >
                  <span className="text-neutral-600">
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                  <span className="font-semibold text-neutral-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
