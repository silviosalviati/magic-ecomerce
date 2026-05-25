import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { requestEmailVerification, verifyEmail } from '../lib/api';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(token));
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!token) return;

    let active = true;
    setLoading(true);
    setError('');
    setMessage('');

    verifyEmail(token)
      .then((response) => {
        if (!active) return;
        setMessage(response.message);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Link inválido ou expirado.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setRequesting(true);

    try {
      const response = await requestEmailVerification(email.trim());
      setMessage(response.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar verificação.');
    } finally {
      setRequesting(false);
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
            Confirme sua<br />conta com segurança.
          </p>
          <p className="auth-brand-caption">Verificação por e-mail</p>
        </div>
      </aside>

      <section className="auth-form-panel">
        <div className="auth-form-inner">
          <Link to="/entrar" className="auth-form-back">
            <ArrowLeft size={13} strokeWidth={1.8} />
            Voltar ao login
          </Link>

          <p className="auth-form-eyebrow">Segurança da conta</p>
          <h1 className="auth-form-title">Confirmar e-mail</h1>
          <p className="auth-form-note">
            Use o link enviado para sua caixa de entrada. Se ele expirou, peça outro abaixo.
          </p>

          {loading && <p className="auth-success">Verificando seu e-mail...</p>}
          {message && <p className="auth-success">{message}</p>}
          {error && <p className="auth-error">{error}</p>}

          {!token && (
            <form onSubmit={handleRequest}>
              <div className="auth-field">
                <input
                  id="verify-email"
                  className="auth-field-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  required
                  autoComplete="email"
                />
                <label className="auth-field-label" htmlFor="verify-email">E-mail</label>
                <span className="auth-field-line" />
              </div>

              <button type="submit" className="auth-form-btn" disabled={requesting}>
                <span>{requesting ? 'Enviando...' : 'Reenviar verificação'}</span>
              </button>
            </form>
          )}

          <p className="auth-form-switch">
            Depois de confirmado, você poderá{' '}
            <Link to="/entrar" className="auth-form-switch-link">
              entrar na conta
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
