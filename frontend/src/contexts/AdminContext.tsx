import axios from 'axios';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export const ADMIN_API =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'https://magic-ecomerce-api-731025483706.us-central1.run.app';

const SESSION_KEY = 'magic.admin.key';

export interface AdminContextValue {
  adminKey: string | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  login: (key: string) => Promise<boolean>;
  logout: () => void;
  headers: Record<string, string>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminKey, setAdminKey] = useState<string | null>(() => {
    try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!adminKey) { setAuthLoading(false); return; }
    axios
      .get(`${ADMIN_API}/admin/dashboard`, { headers: { 'x-admin-key': adminKey } })
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
        setAdminKey(null);
      })
      .finally(() => setAuthLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (key: string): Promise<boolean> => {
    try {
      await axios.get(`${ADMIN_API}/admin/dashboard`, { headers: { 'x-admin-key': key } });
      try { sessionStorage.setItem(SESSION_KEY, key); } catch { /* ignore */ }
      setAdminKey(key);
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setAdminKey(null);
    setIsAuthenticated(false);
  }, []);

  const headers: Record<string, string> = adminKey ? { 'x-admin-key': adminKey } : {};

  return (
    <AdminContext.Provider value={{ adminKey, isAuthenticated, authLoading, login, logout, headers }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
