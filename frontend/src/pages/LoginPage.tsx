import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { authLogin, requestEmailVerification } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string; message?: string; email?: string } | null;
  const from = state?.from || '/minha-conta';
  const emailNotVerified = error.toLowerCase().includes('não verificado');

  useEffect(() => {
    if (state?.email) {
      setEmail(state.email);
    }
    if (state?.message) {
      setMessage(state.message);
    }
  }, [state]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
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

  async function handleResendVerification() {
    if (!email.trim()) {
      setError('Informe seu e-mail para reenviar a verificação.');
      return;
    }

    setResendLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await requestEmailVerification(email.trim());
      setMessage(response.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao reenviar verificação.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <aside className="auth-brand auth-brand--login-manifesto">
        <Link to="/" className="auth-brand-logo" aria-label="Voltar para MAGI.C">
          <img src="/logo/logo-transparent.png" alt="MAGI.C" />
        </Link>
        <div className="auth-brand-body auth-brand-body--manifesto">
          <div className="auth-brand-manifesto-copy">
            <p className="auth-brand-manifesto-text">
              O FUTURO
              <br />
              RESPEITA A ESSENCIA
              <br />
              E ABRACA A <span>MUDANCA.</span>
            </p>
            <p className="auth-brand-manifesto-heart" aria-hidden="true">♥</p>
          </div>
          <div className="auth-brand-waves" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
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

          {message && <p className="auth-success">{message}</p>}

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

          <div className="auth-inline-links">
            {emailNotVerified ? (
              <button
                type="button"
                className="auth-inline-action"
                onClick={handleResendVerification}
                disabled={resendLoading}
              >
                {resendLoading ? 'Reenviando...' : 'Reenviar verificação por e-mail'}
              </button>
            ) : (
              <Link to="/verificar-email" className="auth-inline-action">
                Confirmar e-mail
              </Link>
            )}
            <Link to="/recuperar-senha" className="auth-inline-action">
              Esqueci minha senha
            </Link>
          </div>

          <p className="auth-form-switch">
            Não tem conta?{' '}
            <Link
              to="/cadastrar"
              state={from !== '/minha-conta' ? { from } : undefined}
              className="auth-form-switch-link"
            >
              Criar conta gratuita
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
