import { Navigate } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading } = useAdmin();

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#060606', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="adm-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
