'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import useRequireAuth from '@/src/hooks/useRequireAuth';

interface AdminGuardProps {
  children: ReactNode;
  loadingMessage?: string;
  redirectTo?: string;
  requiredRole?: string;
}

export default function AdminGuard({
  children,
  loadingMessage,
  redirectTo,
  requiredRole,
}: AdminGuardProps) {
  const router = useRouter();
  const { user, loading } = useRequireAuth({ redirectTo });

  let role: string | undefined;
  if (typeof user === 'object' && user !== null) {
    const candidate = (user as { role?: unknown }).role;
    if (typeof candidate === 'string') {
      role = candidate;
    }
  }
  const shouldRedirectForRole = !loading && !!requiredRole && role !== requiredRole;

  useEffect(() => {
    if (shouldRedirectForRole) {
      router.replace(redirectTo ?? '/login');
    }
  }, [shouldRedirectForRole, router, redirectTo]);

  if (loading || shouldRedirectForRole) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-muted">
        {loadingMessage ?? (shouldRedirectForRole ? 'Redirecionando...' : 'Validando acesso...')}
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
