'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
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
    { href: '/sobre', label: 'Como funciona' },
    { href: '/escola', label: 'Escolas' },
    { href: '/uniformes', label: 'Uniformes' },
    { href: '/reservas', label: 'Minhas Reservas' },
];

const guestNav = [
    { href: '/sobre', label: 'Como funciona' },
    { href: '/escola', label: 'Escolas' },
    { href: '/uniformes', label: 'Uniformes' },
    { href: '/login', label: 'Entrar' },
    { href: '/register', label: 'Criar conta' },
];

export default function Header() {
    const { user } = useAuth();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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

    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname, role]);

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-3 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            aria-label="Uniforma - Página inicial"
                            className="inline-flex items-center rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                        >
                            <Image src="/images/logo.png" alt="Uniforma" width={56} height={66} priority />
                        </Link>
                        {role && <Badge tone="accent">{role === 'admin' ? 'Admin' : 'Responsável'}</Badge>}
                    </div>

                    <div className="flex items-center gap-3 md:hidden">
                        <button
                            type="button"
                            onClick={() => setIsMenuOpen(previous => !previous)}
                            aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                            aria-expanded={isMenuOpen}
                            className="flex h-10 w-10 items-center justify-center rounded-card border border-border bg-surface text-text-muted shadow-soft transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-5 w-5"
                            >
                                {isMenuOpen ? (
                                    <path d="M6 6l12 12M18 6l-12 12" />
                                ) : (
                                    <>
                                        <line x1="3" y1="6" x2="21" y2="6" />
                                        <line x1="3" y1="12" x2="21" y2="12" />
                                        <line x1="3" y1="18" x2="21" y2="18" />
                                    </>
                                )}
                            </svg>
                        </button>
                    </div>

                    <nav className="hidden items-center gap-6 text-sm font-medium text-text-muted md:flex">
                        {navItems.map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'transition-colors hover:text-text',
                                    pathname === item.href ? 'text-text' : undefined,
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {isMenuOpen && (
                    <nav className="mt-3 flex flex-col gap-2 rounded-card border border-border bg-surface p-md text-sm font-medium text-text-muted shadow-soft md:hidden">
                        {navItems.map(item => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={cn(
                                    'rounded-card px-sm py-xs transition-colors hover:bg-background hover:text-text',
                                    pathname === item.href ? 'bg-background text-text' : undefined,
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                )}
            </div>
        </header>
    );
}
