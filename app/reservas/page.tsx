'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Alert } from '@/app/components/ui/Alert';
import { Badge } from '@/app/components/ui/Badge';
import { buttonClasses } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { formatCurrency, formatDate } from '@/app/lib/format';
import type { School } from '@/app/lib/models/school';
import type { Uniform } from '@/app/lib/models/uniform';
import useAuth from '@/src/hooks/useAuth';
import type { ReservationDTO, ReservationStatus } from '@/src/types/reservation';

const STATUS_LABELS: Record<ReservationStatus, string> = {
  aguardando: 'Aguardando',
  'em-producao': 'Em produção',
  enviado: 'Enviado',
};

const STATUS_TONES: Record<ReservationStatus, 'warning' | 'accent' | 'success'> = {
  aguardando: 'warning',
  'em-producao': 'accent',
  enviado: 'success',
};

export default function UserReservationsPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();
  const [reservations, setReservations] = useState<ReservationDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolMap, setSchoolMap] = useState<Record<string, string>>({});
  const [uniformMap, setUniformMap] = useState<Record<string, string>>({});
  const [childMap, setChildMap] = useState<Record<string, string>>({});

  const userId = typeof user?._id === 'string' ? user._id : null;
  const role = typeof user?.role === 'string' ? user.role : null;

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!userId) {
      router.replace(`/login?returnTo=${encodeURIComponent('/reservas')}`);
      return;
    }

    if (role === 'admin') {
      router.replace('/admin/dashboard');
      return;
    }

    const controller = new AbortController();

    async function loadReservations() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/reservations?userId=${userId}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message = payload?.error ?? 'Não foi possível carregar suas reservas.';
          throw new Error(message);
        }

        const payload = (await response.json()) as { data: ReservationDTO[] };
        setReservations(payload.data ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Falha ao carregar reservas.';
        setError(message);
        setReservations([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadReservations();

    return () => controller.abort();
  }, [accessToken, loading, role, router, userId]);

  useEffect(() => {
    if (loading || !userId || role === 'admin') {
      return;
    }

    const controller = new AbortController();

    async function loadMetadata() {
      try {
        const [schoolsResponse, uniformsResponse] = await Promise.all([
          fetch('/api/schools', { signal: controller.signal }),
          fetch('/api/uniforms', { signal: controller.signal }),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        if (schoolsResponse.ok) {
          const schoolsPayload = (await schoolsResponse.json()) as { data: School[] };
          const nextMap: Record<string, string> = {};
          for (const school of schoolsPayload.data ?? []) {
            nextMap[school.id] = school.name;
          }
          setSchoolMap(nextMap);
        }

        if (uniformsResponse.ok) {
          const uniformsPayload = (await uniformsResponse.json()) as { data: Uniform[] };
          const nextMap: Record<string, string> = {};
          for (const uniform of uniformsPayload.data ?? []) {
            nextMap[uniform.id] = uniform.name;
          }
          setUniformMap(nextMap);
        }

        // build child lookup from current user in context (includes children)
        type UserChild = { _id?: string; name?: string | null };
        const children = Array.isArray(user?.children) ? (user.children as UserChild[]) : [];
        const childLookup: Record<string, string> = {};
        for (const child of children) {
          const id = typeof child?._id === 'string' ? child._id : undefined;
          const name = typeof child?.name === 'string' ? child.name : undefined;
          if (id && name) {
            childLookup[id] = name;
          }
        }
        setChildMap(childLookup);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Failed to load reservation metadata', err);
        }
      }
    }

    void loadMetadata();

    return () => controller.abort();
  }, [loading, role, user, userId]);

  const sortedReservations = useMemo(
    () =>
      [...reservations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [reservations],
  );

  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-xl px-md py-2xl">
        <header className="flex flex-col gap-sm">
          <h1 className="text-h2 font-heading">Minhas Reservas</h1>
          <p className="text-body text-text-muted">
            Acompanhe o status das suas reservas e inicie novas solicitações quando precisar.
          </p>
        </header>

        <div className="flex flex-wrap gap-md">
          <Link href="/alunos" className={buttonClasses({ variant: 'primary', size: 'md' })}>
            Iniciar nova reserva
          </Link>
        </div>

        {error && <Alert tone="danger" description={error} />}

        {isLoading ? (
          <Card emphasis="muted" className="text-center text-body text-text-muted">
            Carregando reservas...
          </Card>
        ) : sortedReservations.length === 0 ? (
          <Card emphasis="muted" className="flex flex-col items-center gap-sm text-center">
            <h2 className="text-h4 font-heading text-text">Nenhuma reserva encontrada</h2>
            <p className="text-body text-text-muted">
              Assim que você confirmar uma reserva, ela aparecerá aqui para acompanhamento.
            </p>
            <Link href="/alunos" className={buttonClasses({ variant: 'primary', size: 'md' })}>
              Começar agora
            </Link>
          </Card>
        ) : (
          <div className="grid gap-lg">
            {sortedReservations.map(reservation => {
              const uniformName = uniformMap[reservation.uniformId] ?? reservation.uniformId;
              const schoolName = schoolMap[reservation.schoolId] ?? reservation.schoolId;
              const childName = childMap[reservation.childId] ?? 'Aluno não identificado';

              return (
                <Card key={reservation.id} className="flex flex-col gap-sm">
                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <div className="flex flex-col gap-xxs sm:flex-row sm:items-center sm:gap-sm">
                      <h2 className="text-h4 font-heading">{childName}</h2>
                      <span className="text-caption text-text-muted">
                        Responsável: {reservation.userName}
                      </span>
                      <Badge tone={STATUS_TONES[reservation.status]}>
                        {STATUS_LABELS[reservation.status]}
                      </Badge>
                    </div>
                    <span className="text-caption text-text-muted">
                      Criada em {formatDate(reservation.createdAt)}
                    </span>
                  </div>

                  <div className="grid gap-sm sm:grid-cols-2">
                    <dl className="flex flex-col gap-xs text-body">
                      <div className="flex justify-between">
                        <dt className="text-text-muted">Uniforme</dt>
                        <dd className="font-medium">{uniformName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-muted">Escola</dt>
                        <dd className="font-medium">{schoolName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-muted">Tamanho</dt>
                        <dd className="font-medium">{reservation.suggestedSize}</dd>
                      </div>
                    </dl>

                    <dl className="flex flex-col gap-xs text-body">
                      <div className="flex justify-between">
                        <dt className="text-text-muted">Valor</dt>
                        <dd className="font-medium">{formatCurrency(reservation.value)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-text-muted">Atualizado em</dt>
                        <dd className="font-medium">{formatDate(reservation.updatedAt)}</dd>
                      </div>
                    </dl>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
