import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';

export function AdminLoginPage() {
  const { isAuthenticated, authLoading, login } = useAdmin();
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (authLoading) {
    return (
      <div className="adm-login">
        <span className="adm-spinner" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/admin/dashboard" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    const ok = await login(key.trim());
    setLoading(false);
    if (ok) {
      navigate('/admin/dashboard', { replace: true });
    } else {
      setError('Senha incorreta. Verifique e tente novamente.');
      setKey('');
    }
  }

  return (
    <div className="adm-login">
      <div className="adm-login-wrap">
        {/* Brand */}
        <div className="adm-login-brand">
          <p className="adm-login-wordmark">Vista Magic</p>
          <div className="adm-login-rule" />
          <p className="adm-login-tagline">Painel Administrativo</p>
        </div>

        {/* Card */}
        <div className="adm-login-card">
          {error && (
            <div className="adm-login-error">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{flexShrink:0}}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="adm-login-field">
              <label className="adm-login-label" htmlFor="adm-key">Senha de acesso</label>
              <input
                id="adm-key"
                type="password"
                className="adm-login-input"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="adm-login-btn"
              disabled={loading || !key.trim()}
            >
              {loading
                ? <span className="adm-spinner" style={{ borderTopColor: '#080808', borderColor: 'rgba(8,8,8,0.25)', width: 14, height: 14 }} />
                : 'Acessar painel'}
            </button>
          </form>
        </div>

        <p className="adm-login-footer">vistamagic.com.br</p>
      </div>
    </div>
  );
}
