import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { authLogin } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/minha-conta';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await authLogin(email.trim(), password);
      login(token, user);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <aside className="auth-brand">
        <Link to="/" className="auth-brand-logo" aria-label="Voltar para MAGI.C">
          <img src="/logo/logo-transparent.png" alt="MAGI.C" />
        </Link>
        <div className="auth-brand-body">
          <div className="auth-brand-ornament">
            <span className="auth-brand-ornament-diamond" />
          </div>
          <p className="auth-brand-tagline">
            Vista o que<br />você sente.
          </p>
          <p className="auth-brand-caption">Moda feminina e masculina</p>
        </div>
      </aside>

      <section className="auth-form-panel">
        <div className="auth-form-inner">
          <Link to="/" className="auth-form-back">
            <ArrowLeft size={13} strokeWidth={1.8} />
            Voltar à loja
          </Link>

          <p className="auth-form-eyebrow">Sua conta</p>
          <h1 className="auth-form-title">Entrar</h1>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <input
                id="login-email"
                className="auth-field-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                required
                autoComplete="email"
              />
              <label className="auth-field-label" htmlFor="login-email">E-mail</label>
              <span className="auth-field-line" />
            </div>

            <div className="auth-field">
              <input
                id="login-password"
                className="auth-field-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                required
                autoComplete="current-password"
              />
              <label className="auth-field-label" htmlFor="login-password">Senha</label>
              <span className="auth-field-line" />
              <button
                type="button"
                className="auth-field-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                tabIndex={-1}
              >
                {showPassword
                  ? <EyeOff size={16} strokeWidth={1.6} />
                  : <Eye size={16} strokeWidth={1.6} />}
              </button>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-form-btn" disabled={loading}>
              <span>{loading ? 'Entrando…' : 'Entrar'}</span>
            </button>
          </form>

          <p className="auth-form-switch">
            Não tem conta?{' '}
            <Link to="/cadastrar" className="auth-form-switch-link">
              Criar conta gratuita
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
