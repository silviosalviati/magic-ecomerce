import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

export const ADMIN_API =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'https://magic-ecomerce-api-731025483706.us-central1.run.app';

export interface AdminContextValue {
  isAuthenticated: boolean;
  authLoading: boolean;
  logout: () => void;
  headers: Record<string, string>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user, token, loading, logout } = useAuth();

  const headers = useMemo<Record<string, string>>(() => {
    if (!token) return {} as Record<string, string>;
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const isAuthenticated = Boolean(token && user?.isAdmin);
  const authLoading = loading;

  return (
    <AdminContext.Provider value={{ isAuthenticated, authLoading, logout, headers }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
