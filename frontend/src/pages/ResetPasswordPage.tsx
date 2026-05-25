import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { resetPassword } from '../lib/api';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('Link de redefinição inválido ou ausente.');
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Link de redefinição inválido ou ausente.');
      return;
    }

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
      const response = await resetPassword(token, password);
      setMessage(response.message);
      navigate('/entrar', {
        replace: true,
        state: { message: response.message },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha.');
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
            Nova senha,<br />novo acesso.
          </p>
          <p className="auth-brand-caption">Link temporário e seguro</p>
        </div>
      </aside>

      <section className="auth-form-panel">
        <div className="auth-form-inner">
          <Link to="/entrar" className="auth-form-back">
            <ArrowLeft size={13} strokeWidth={1.8} />
            Voltar ao login
          </Link>

          <p className="auth-form-eyebrow">Redefinir senha</p>
          <h1 className="auth-form-title">Criar nova senha</h1>
          <p className="auth-form-note">
            Escolha uma senha forte e nunca reutilizada. O link expira em pouco tempo.
          </p>

          {message && <p className="auth-success">{message}</p>}
          {error && <p className="auth-error">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <input
                id="reset-password"
                className="auth-field-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                required
                autoComplete="new-password"
              />
              <label className="auth-field-label" htmlFor="reset-password">Nova senha</label>
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
                id="reset-confirm"
                className="auth-field-input"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder=" "
                required
                autoComplete="new-password"
              />
              <label className="auth-field-label" htmlFor="reset-confirm">Confirmar senha</label>
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

            <button type="submit" className="auth-form-btn" disabled={loading || !token}>
              <span>{loading ? 'Salvando...' : 'Salvar nova senha'}</span>
            </button>
          </form>

          <p className="auth-form-switch">
            Precisa de outro link?{' '}
            <Link to="/recuperar-senha" className="auth-form-switch-link">
              Solicitar recuperação
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
