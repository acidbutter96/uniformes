import Link from 'next/link';
import { Card } from '@/app/components/ui/Card';
import { cn } from '@/app/lib/utils';

const MOCK_RESERVATION = {
  id: 'RES-2025-0914',
  pickupWindow: 'a partir de 12 de dezembro',
};

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-xl px-md py-2xl text-center">
        <Card className="flex flex-col items-center gap-lg text-center">
          <div className="flex flex-col gap-xs">
            <span className="text-caption font-medium uppercase tracking-wide text-primary">
              Reserva confirmada
            </span>
            <h1 className="text-h2 font-heading">Sua solicitação foi registrada!</h1>
            <p className="max-w-xl text-body text-text-muted">
              Em breve você receberá um e-mail com todos os detalhes. Acompanhe o progresso da
              reserva pelo painel ou ajuste as informações caso necessário.
            </p>
          </div>

          <div className="flex flex-col gap-xs rounded-card bg-background px-lg py-md text-body text-text">
            <span className="text-caption uppercase tracking-wide text-text-muted">
              Número da reserva
            </span>
            <strong className="text-h3 font-heading">{MOCK_RESERVATION.id}</strong>
            <span className="text-caption text-text-muted">
              Retirada disponível {MOCK_RESERVATION.pickupWindow}
            </span>
          </div>

          <Link
            href="/"
            className={cn(
              'inline-flex items-center justify-center gap-xs rounded-card bg-primary px-lg py-sm text-body font-semibold text-surface shadow-soft transition-colors hover:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            Retornar ao início
          </Link>
        </Card>
      </div>
    </main>
  );
}
