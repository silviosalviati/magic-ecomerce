import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { authRegister } from '../lib/api';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { from?: string } | null;
  const from = locationState?.from;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }

    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const response = await authRegister(name.trim(), email.trim(), password);
      navigate('/entrar', {
        replace: true,
        state: {
          message: response.message,
          email,
          from,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar conta.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <aside className="auth-brand auth-brand--register-story">
        <Link to="/" className="auth-brand-logo" aria-label="Voltar para MAGI.C">
          <img src="/logo/logo-transparent.png" alt="MAGI.C" />
        </Link>
        <div className="auth-brand-body auth-brand-body--register-story">
          <article className="auth-brand-story-panel auth-brand-story-panel--vision">
            <img
              className="auth-brand-story-mark"
              src="/logo/logo-transparent.png"
              alt="Manifesto MAGI.C"
            />
            <p className="auth-brand-story-line">
              TUDO COMEÇA
              <br />
              COM UMA <span>VISÃO.</span>
            </p>
            <div className="auth-brand-story-waves" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </article>

          <article className="auth-brand-story-panel auth-brand-story-panel--courage">
            <div className="auth-brand-story-shatter" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="auth-brand-story-line">
              MAS CRESCER
              <br />
              EXIGE <span>CORAGEM.</span>
            </p>
          </article>

          <article className="auth-brand-story-panel auth-brand-story-panel--essence">
            <p className="auth-brand-story-line">
              MUDAR É PERMITIR
              <br />
              QUE A ESSÊNCIA
              <br />
              <span>EVOLUA.</span>
            </p>
          </article>
        </div>
      </aside>

      <section className="auth-form-panel">
        <div className="auth-form-inner">
          <Link to="/" className="auth-form-back">
            <ArrowLeft size={13} strokeWidth={1.8} />
            Voltar à loja
          </Link>

          <p className="auth-form-eyebrow">Primeira vez aqui?</p>
          <h1 className="auth-form-title">Criar conta</h1>
          <p className="auth-form-note">
            Para sua segurança, a conta só é ativada após confirmar o e-mail recebido.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <input
                id="reg-name"
                className="auth-field-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=" "
                required
                autoComplete="name"
              />
              <label className="auth-field-label" htmlFor="reg-name">Nome completo</label>
              <span className="auth-field-line" />
            </div>

            <div className="auth-field">
              <input
                id="reg-email"
                className="auth-field-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                required
                autoComplete="email"
              />
              <label className="auth-field-label" htmlFor="reg-email">E-mail</label>
              <span className="auth-field-line" />
            </div>

            <div className="auth-field">
              <input
                id="reg-password"
                className="auth-field-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                required
                autoComplete="new-password"
              />
              <label className="auth-field-label" htmlFor="reg-password">Senha</label>
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

            <div className="auth-field">
              <input
                id="reg-confirm"
                className="auth-field-input"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder=" "
                required
                autoComplete="new-password"
              />
              <label className="auth-field-label" htmlFor="reg-confirm">Confirmar senha</label>
              <span className="auth-field-line" />
              <button
                type="button"
                className="auth-field-toggle"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Ocultar confirmação' : 'Ver confirmação'}
                tabIndex={-1}
              >
                {showConfirm
                  ? <EyeOff size={16} strokeWidth={1.6} />
                  : <Eye size={16} strokeWidth={1.6} />}
              </button>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-form-btn" disabled={loading}>
              <span>{loading ? 'Criando conta…' : 'Criar conta'}</span>
            </button>
          </form>

          <p className="auth-form-switch">
            Já tem conta?{' '}
            <Link to="/entrar" className="auth-form-switch-link">
              Entrar
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
