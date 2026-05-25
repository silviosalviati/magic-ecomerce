import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { requestPasswordReset } from '../lib/api';

export function PasswordRecoveryPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await requestPasswordReset(email.trim());
      setMessage(response.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar recuperação.');
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
            Recuperação<br />de acesso segura.
          </p>
          <p className="auth-brand-caption">Senha nova só por e-mail</p>
        </div>
      </aside>

      <section className="auth-form-panel">
        <div className="auth-form-inner">
          <Link to="/entrar" className="auth-form-back">
            <ArrowLeft size={13} strokeWidth={1.8} />
            Voltar ao login
          </Link>

          <p className="auth-form-eyebrow">Recuperar senha</p>
          <h1 className="auth-form-title">Receber link por e-mail</h1>
          <p className="auth-form-note">
            Enviaremos um link temporário para criar uma nova senha. Nunca pedimos sua senha atual por e-mail.
          </p>

          {message && <p className="auth-success">{message}</p>}
          {error && <p className="auth-error">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <input
                id="recovery-email"
                className="auth-field-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                required
                autoComplete="email"
              />
              <label className="auth-field-label" htmlFor="recovery-email">E-mail</label>
              <span className="auth-field-line" />
            </div>

            <button type="submit" className="auth-form-btn" disabled={loading}>
              <span>{loading ? 'Enviando...' : 'Enviar link de recuperação'}</span>
            </button>
          </form>

          <p className="auth-form-switch">
            Lembrou a senha?{' '}
            <Link to="/entrar" className="auth-form-switch-link">
              Voltar para entrar
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
