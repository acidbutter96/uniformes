'use client';

import type { ReactNode } from 'react';

import useRequireAuth from '@/src/hooks/useRequireAuth';

interface AdminGuardProps {
    children: ReactNode;
    loadingMessage?: string;
}

export default function AdminGuard({ children, loadingMessage }: AdminGuardProps) {
    const { user, loading } = useRequireAuth();

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-muted">
                {loadingMessage ?? 'Validando acesso...'}
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-muted">
                Redirecionando para login...
            </div>
        );
    }

    return <>{children}</>;
}
