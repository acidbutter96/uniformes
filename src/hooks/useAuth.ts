'use client';

import { useAuth as useAuthContext } from '@/src/context/AuthContext';

export function useAuth() {
  return useAuthContext();
}

export default useAuth;
