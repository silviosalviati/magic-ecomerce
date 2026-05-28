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

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

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
      <div className="adm-login-card">
        <div className="adm-login-brand">
          <p className="adm-login-wordmark">Vista Magic</p>
          <div className="adm-login-sep" />
          <p className="adm-login-subtitle">Acesso Administrativo</p>
        </div>

        <h2 className="adm-login-title">Entrar no painel</h2>

        {error && <p className="adm-login-error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="adm-login-field">
            <label className="adm-login-label" htmlFor="adm-key">
              Senha de acesso
            </label>
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

          <button type="submit" className="adm-login-btn" disabled={loading || !key.trim()}>
            {loading ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)' }} /> : 'Acessar painel'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 28, fontFamily: 'Arial,sans-serif', fontSize: 11, color: '#3D3330' }}>
          vistamagic.com.br
        </p>
      </div>
    </div>
  );
}
