'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import useRequireAuth from '@/src/hooks/useRequireAuth';

type AdminAllowedRole = 'admin' | 'user' | 'supplier' | (string & {});

interface AdminGuardProps {
  children: ReactNode;
  loadingMessage?: string;
  redirectTo?: string;
  requiredRole?: AdminAllowedRole | AdminAllowedRole[];
}

export default function AdminGuard({
  children,
  loadingMessage,
  redirectTo,
  requiredRole,
}: AdminGuardProps) {
  const router = useRouter();
  const { user, loading } = useRequireAuth({ redirectTo });

  let role: AdminAllowedRole | undefined;
  if (typeof user === 'object' && user !== null) {
    const candidate = (user as { role?: unknown }).role;
    if (typeof candidate === 'string') {
      role = candidate;
    }
  }
  const shouldRedirectForRole = useMemo(() => {
    if (loading || !requiredRole) return false;

    if (Array.isArray(requiredRole)) {
      return !requiredRole.includes(role ?? '');
    }

    return role !== requiredRole;
  }, [loading, requiredRole, role]);

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
