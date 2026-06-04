import { Navigate, useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { useAuth } from '../contexts/AuthContext';

export function AdminLoginPage() {
  const { isAuthenticated, authLoading } = useAdmin();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="adm-login">
        <span className="adm-spinner" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/admin/dashboard" replace />;

  function goToUserLogin() {
    navigate('/entrar', {
      replace: true,
      state: {
        from: '/admin/dashboard',
        message: 'Entre com uma conta que tenha permissao de administrador.',
      },
    });
  }

  const loggedWithoutAdmin = Boolean(token && user && !user.isAdmin);

  return (
    <div className="adm-login">
      <div className="adm-login-wrap">
        {/* Brand */}
        <div className="adm-login-brand">
          <img src="/logo/logo-transparent.png" alt="Vista Magic" className="adm-login-logo" />
          <p className="adm-login-tagline">Painel Administrativo</p>
        </div>

        {/* Card */}
        <div className="adm-login-card">
          {loggedWithoutAdmin ? (
            <div className="adm-login-error">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Esta conta nao possui permissao de administrador.
            </div>
          ) : (
            <p style={{ color: '#6B5F5C', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 16px' }}>
              Use seu login normal. O painel libera automaticamente para contas marcadas como admin.
            </p>
          )}

          <div>
            <button
              type="button"
              className="adm-login-btn"
              onClick={goToUserLogin}
            >
              Ir para login
            </button>
          </div>
        </div>

        <p className="adm-login-footer">vistamagic.com.br</p>
      </div>
    </div>
  );
}
