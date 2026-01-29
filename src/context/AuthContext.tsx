'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

export interface AuthUser extends Record<string, unknown> {
  _id?: string;
  role?: 'user' | 'admin' | 'supplier';
  name?: string;
  email?: string;
  cpf?: string;
  birthDate?: string | Date;
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    state?: string;
  };
  children?: Array<{
    _id?: string;
    name: string;
    age: number;
    schoolId: string;
  }>;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: true,
  accessToken: null,
  refreshToken: null,
};

type AuthAction =
  | { type: 'SET_USER'; payload: AuthUser | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TOKENS'; payload: { accessToken: string | null; refreshToken: string | null } }
  | { type: 'RESET' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_TOKENS':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      };
    case 'RESET':
      return { ...initialState, loading: false };
    default:
      return state;
  }
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: Record<string, unknown>) => Promise<AuthUser>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  let payload: unknown = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const hasErrorField = typeof payload === 'object' && payload !== null && 'error' in payload;
    const message =
      hasErrorField && typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error?: string }).error
        : 'Request failed';
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return payload as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const persistTokens = useCallback((accessToken: string | null, refreshToken: string | null) => {
    if (typeof window === 'undefined') return;

    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }

    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }, []);

  const loadUser = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const tokens = {
        accessToken: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
        refreshToken: typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null,
      };

      dispatch({ type: 'SET_TOKENS', payload: tokens });

      if (!tokens.accessToken) {
        dispatch({ type: 'RESET' });
        return;
      }

      const me = await request<{ data: AuthUser }>('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        cache: 'no-store',
      });

      dispatch({ type: 'SET_USER', payload: me.data });
    } catch (error: unknown) {
      // 401 significa apenas que o usuário não está autenticado; não precisamos logar erro
      const status =
        typeof error === 'object' && error !== null && 'status' in error
          ? (error as { status?: number }).status
          : undefined;
      const message = error instanceof Error ? error.message : undefined;
      if (status === 401 || message === 'Unauthorized.') {
        dispatch({ type: 'RESET' });
      } else {
        console.error('Failed to load user', error);
        dispatch({ type: 'RESET' });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const payload = await request<{
          token: string;
          refreshToken?: string;
          user: AuthUser;
        }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        persistTokens(payload.token, payload.refreshToken ?? null);
        dispatch({
          type: 'SET_TOKENS',
          payload: { accessToken: payload.token, refreshToken: payload.refreshToken ?? null },
        });
        dispatch({ type: 'SET_USER', payload: payload.user });

        return payload.user;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [persistTokens],
  );

  const register = useCallback(
    async (data: Record<string, unknown>) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const payload = await request<{
          user: AuthUser;
          token?: string;
          refreshToken?: string;
          verificationRequired?: boolean;
        }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        // Registration now requires email verification; do not auto-login.
        persistTokens(null, null);
        dispatch({ type: 'SET_TOKENS', payload: { accessToken: null, refreshToken: null } });
        dispatch({ type: 'SET_USER', payload: null });

        return payload.user;
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [persistTokens],
  );

  const logout = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Failed to logout', error);
    } finally {
      persistTokens(null, null);
      dispatch({ type: 'RESET' });
    }
  }, [persistTokens]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      loadUser,
    }),
    [state, login, register, logout, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
