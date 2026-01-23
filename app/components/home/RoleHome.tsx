'use client';

import Link from 'next/link';

import { Badge } from '@/app/components/ui/Badge';
import { buttonClasses } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import useAuth from '@/src/hooks/useAuth';

type Role = 'admin' | 'supplier' | 'user' | null;

type HomeLink = {
  title: string;
  description: string;
  href: string;
};

const supplierLinks: HomeLink[] = [
  {
    title: 'Reservas',
    description: 'Acompanhe e atualize o status das reservas do seu fornecedor.',
    href: '/admin/reservations',
  },
  {
    title: 'Escolas atendidas',
    description: 'Defina e revise as escolas em que você pode atender reservas.',
    href: '/admin/escolas-atendidas',
  },
  {
    title: 'Dashboard',
    description: 'Visão rápida das suas reservas e escolas atendidas.',
    href: '/admin/dashboard',
  },
];

const adminLinks: HomeLink[] = [
  {
    title: 'Dashboard',
    description: 'Visão geral do sistema e do fluxo de reservas.',
    href: '/admin/dashboard',
  },
  {
    title: 'Reservas',
    description: 'Monitore e acompanhe o ciclo de vida das reservas.',
    href: '/admin/reservations',
  },
  {
    title: 'Escolas',
    description: 'Gerencie escolas participantes e seus dados.',
    href: '/admin/schools',
  },
  {
    title: 'Fornecedores',
    description: 'Cadastre, acompanhe e convide fornecedores.',
    href: '/admin/suppliers',
  },
  {
    title: 'Uniformes',
    description: 'Cadastre modelos, tamanhos e kits de uniformes.',
    href: '/admin/uniforms',
  },
];

const adminHowItWorksSteps = [
  {
    title: '1. Estrutura do programa',
    description:
      'Cadastre e mantenha escolas e uniformes atualizados para refletir modelos, kits e tamanhos.',
  },
  {
    title: '2. Fornecedores habilitados',
    description:
      'Gerencie fornecedores, convites e status, garantindo que existam usuários vinculados quando necessário.',
  },
  {
    title: '3. Reservas e rastreabilidade',
    description:
      'Acompanhe o fluxo de reservas e o andamento por status para identificar gargalos e prazos.',
  },
  {
    title: '4. Ajustes e governança',
    description:
      'Use configurações e relatórios para manter consistência e previsibilidade do processo.',
  },
] as const;

function resolveDisplayName(user: unknown) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const candidateName = (user as { name?: unknown }).name;
  if (typeof candidateName === 'string' && candidateName.trim()) {
    return candidateName.trim();
  }

  const candidateEmail = (user as { email?: unknown }).email;
  if (typeof candidateEmail === 'string' && candidateEmail.trim()) {
    return candidateEmail.trim();
  }

  return null;
}

function SupplierHome({ displayName }: { displayName: string | null }) {
  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-2xl px-md py-2xl">
        <section className="flex flex-col gap-lg">
          <Badge tone="accent" className="w-fit bg-accent/25 text-text">
            Área do fornecedor
          </Badge>
          <div className="flex flex-col gap-sm">
            <h1 className="text-h1 font-heading">{displayName ? `Olá, ${displayName}` : 'Olá'}</h1>
            <p className="max-w-3xl text-body text-text-muted">
              Aqui você acompanha as reservas do seu fornecedor, atualiza o status e mantém as
              escolas atendidas em dia.
            </p>
          </div>
          <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
            <Link
              href="/admin/reservations"
              className={buttonClasses({ className: 'px-lg py-sm' })}
            >
              Ver reservas
            </Link>
            <Link
              href="/sobre"
              className="inline-flex items-center justify-center gap-xs px-lg py-sm text-body font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Conheça como funciona
            </Link>
          </div>
        </section>

        <section className="grid gap-lg md:grid-cols-3">
          {supplierLinks.map(link => (
            <Card key={link.href} className="flex flex-col gap-sm p-lg">
              <h2 className="text-h3 font-heading text-primary">{link.title}</h2>
              <p className="text-body text-text-muted">{link.description}</p>
              <div className="pt-sm">
                <Link href={link.href} className={buttonClasses({ variant: 'secondary' })}>
                  Acessar
                </Link>
              </div>
            </Card>
          ))}
        </section>

        <section className="flex flex-col gap-lg">
          <div className="flex flex-col gap-xs">
            <h2 className="text-h2 font-heading">Como funciona para fornecedores</h2>
            <p className="max-w-3xl text-body text-text-muted">
              Um fluxo objetivo para acompanhar pedidos e organizar a produção/entrega.
            </p>
          </div>
          <Card emphasis="muted" className="flex flex-col gap-md p-xl">
            <ul className="flex flex-col gap-sm text-body text-text-muted">
              {[
                'Acesse “Reservas” para ver apenas as reservas atribuídas ao seu fornecedor.',
                'Atualize o status conforme o andamento: recebida → em processamento → finalizada → entregue (ou cancelada).',
                'Mantenha “Escolas atendidas” atualizado para garantir que as reservas sejam direcionadas corretamente.',
                'Use o dashboard apenas como visão rápida (sem substituir a tela de reservas).',
              ].map((item, index) => (
                <li key={item} className="flex items-start gap-sm">
                  <span className="mt-[2px] flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-caption font-semibold text-primary">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section className="flex flex-col gap-sm">
          <h2 className="text-h2 font-heading">Seu acesso</h2>
          <Card emphasis="muted" className="flex flex-col gap-sm p-xl">
            <p className="text-body text-text">
              Você está logado como{' '}
              <span className="font-semibold text-text">{displayName ?? 'Fornecedor'}</span>.
            </p>
            <p className="text-body text-text-muted">
              Como fornecedor, você não inicia reservas para alunos — você acompanha e atualiza o
              andamento das reservas do seu atendimento.
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}

function AdminHome({ displayName }: { displayName: string | null }) {
  return (
    <main className="min-h-screen bg-background text-text">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-2xl px-md py-2xl">
        <section className="flex flex-col gap-lg">
          <Badge tone="accent" className="w-fit bg-primary/15 text-primary">
            Área administrativa
          </Badge>
          <div className="flex flex-col gap-sm">
            <h1 className="text-h1 font-heading">{displayName ? `Olá, ${displayName}` : 'Olá'}</h1>
            <p className="max-w-3xl text-body text-text-muted">
              Central de gestão para escolas, uniformes, fornecedores e acompanhamento do fluxo de
              reservas.
            </p>
          </div>
          <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
            <Link href="/admin/dashboard" className={buttonClasses({ className: 'px-lg py-sm' })}>
              Abrir dashboard
            </Link>
            <Link
              href="/sobre"
              className="inline-flex items-center justify-center gap-xs px-lg py-sm text-body font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Conheça como funciona
            </Link>
          </div>
        </section>

        <section className="grid gap-lg md:grid-cols-3">
          {adminLinks.map(link => (
            <Card key={link.href} className="flex flex-col gap-sm p-lg">
              <h2 className="text-h3 font-heading text-primary">{link.title}</h2>
              <p className="text-body text-text-muted">{link.description}</p>
              <div className="pt-sm">
                <Link href={link.href} className={buttonClasses({ variant: 'secondary' })}>
                  Acessar
                </Link>
              </div>
            </Card>
          ))}
        </section>

        <section className="flex flex-col gap-lg">
          <div className="flex flex-col gap-xs">
            <h2 className="text-h2 font-heading">Como funciona para admins</h2>
            <p className="max-w-3xl text-body text-text-muted">
              Uma visão geral do que você administra no sistema.
            </p>
          </div>
          <div className="grid gap-lg md:grid-cols-2">
            {adminHowItWorksSteps.map(step => (
              <Card key={step.title} emphasis="muted" className="flex flex-col gap-sm p-lg">
                <h3 className="text-h3 font-heading text-text">{step.title}</h3>
                <p className="text-body text-text-muted">{step.description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-sm">
          <h2 className="text-h2 font-heading">Seu acesso</h2>
          <Card emphasis="muted" className="flex flex-col gap-sm p-xl">
            <p className="text-body text-text">
              Você está logado como{' '}
              <span className="font-semibold text-text">{displayName ?? 'Admin'}</span>.
            </p>
            <p className="text-body text-text-muted">
              Como admin, você possui acesso total às áreas administrativas e consegue visualizar o
              sistema de forma global.
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}

export default function RoleHome() {
  const { user, loading } = useAuth();

  const role: Role = typeof user?.role === 'string' ? (user.role as Role) : null;
  const displayName = resolveDisplayName(user);

  if (loading) {
    return null;
  }

  if (role === 'supplier') {
    return <SupplierHome displayName={displayName} />;
  }

  if (role === 'admin') {
    return <AdminHome displayName={displayName} />;
  }

  return null;
}
