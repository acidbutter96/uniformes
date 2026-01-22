'use client';

import Link from 'next/link';

import { buttonClasses } from '@/app/components/ui/Button';
import useAuth from '@/src/hooks/useAuth';

export default function HomePrimaryCta() {
  const { user, loading } = useAuth();

  const role = typeof user?.role === 'string' ? user.role : null;

  if (loading) {
    return (
      <span className={buttonClasses({ className: 'pointer-events-none px-lg py-sm opacity-70' })}>
        Carregando...
      </span>
    );
  }

  if (role === 'admin' || role === 'supplier') {
    return (
      <Link href="/admin/dashboard" className={buttonClasses({ className: 'px-lg py-sm' })}>
        Acessar dashboard
      </Link>
    );
  }

  return (
    <Link href="/reservas" className={buttonClasses({ className: 'px-lg py-sm' })}>
      Reservar uniforme
    </Link>
  );
}
