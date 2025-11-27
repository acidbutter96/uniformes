'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import useAuth from '@/src/hooks/useAuth';

export interface UseRequireAuthOptions {
    redirectTo?: string;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
    const { redirectTo = '/login' } = options;
    const router = useRouter();
    const auth = useAuth();
    const { user, loading } = auth;

    useEffect(() => {
        if (!loading && !user) {
            router.replace(redirectTo);
        }
    }, [loading, user, router, redirectTo]);

    return auth;
}

export default useRequireAuth;
