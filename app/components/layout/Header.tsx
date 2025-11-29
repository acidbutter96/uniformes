'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

import { Badge } from '@/app/components/ui/Badge';
import { cn } from '@/app/lib/utils';
import useAuth from '@/src/hooks/useAuth';

const adminNav = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/schools', label: 'Escolas' },
  { href: '/admin/suppliers', label: 'Fornecedores' },
  { href: '/admin/uniforms', label: 'Uniformes' },
  { href: '/admin/reservations', label: 'Reservas' },
];

const userNav = [
  { href: '/escola', label: 'Escolas' },
  { href: '/uniformes', label: 'Uniformes' },
  { href: '/reservas', label: 'Minhas Reservas' },
];

const guestNav = [
  { href: '/escola', label: 'Escolas' },
  { href: '/uniformes', label: 'Uniformes' },
  { href: '/login', label: 'Entrar' },
  { href: '/register', label: 'Criar conta' },
];

export default function Header() {
  const { user } = useAuth();
  const pathname = usePathname();

  const role = typeof user?.role === 'string' ? (user.role as 'admin' | 'user') : null;

  const navItems = useMemo(() => {
    if (role === 'admin') {
      return adminNav;
    }

    if (role === 'user') {
      return userNav;
    }

    return guestNav;
  }, [role]);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold tracking-tight text-neutral-900">
            Uniformes
          </Link>
          {role && <Badge tone="accent">{role === 'admin' ? 'Admin' : 'Responsável'}</Badge>}
        </div>
        <nav className="flex items-center gap-6 text-sm font-medium text-neutral-600">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'transition-colors hover:text-neutral-900',
                pathname === item.href ? 'text-neutral-900' : undefined,
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
