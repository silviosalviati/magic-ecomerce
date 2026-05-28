import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyOrders, lookupOrders } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { Order } from '../types';
import { OrderCard } from '../components/OrderCard';

function formatCpf(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function OrderLookupPage() {
  const { user, token, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guest lookup form
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');

  // Auto-load for logged-in users
  useEffect(() => {
    if (authLoading || !user || !token) return;

    setLoading(true);
    setError('');
    getMyOrders(token)
      .then((data) => setOrders(data))
      .catch(() => setError('Não foi possível carregar seus pedidos. Tente novamente.'))
      .finally(() => setLoading(false));
  }, [authLoading, user, token]);

  async function handleGuestLookup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOrders(null);
    setLoading(true);

    try {
      const result = await lookupOrders(email.trim(), cpf.replace(/\D/g, ''));
      setOrders(result);
      if (result.length === 0) setError('Nenhum pedido encontrado para este e-mail e CPF.');
    } catch {
      setError('Erro ao buscar pedidos. Verifique seus dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <main className="olp-page">
        <div className="olp-loading-shell">
          <div className="olp-skeleton-bar" style={{ width: '38%', height: 14 }} />
          <div className="olp-skeleton-bar" style={{ width: '62%', height: 44, marginTop: 12 }} />
          <div className="olp-skeleton-bar" style={{ width: '100%', height: 160, marginTop: 40 }} />
          <div className="olp-skeleton-bar" style={{ width: '100%', height: 160, marginTop: 12 }} />
        </div>
      </main>
    );
  }

  return (
    <main className="olp-page">
      <div className="olp-shell">

        {/* ── HEADER ── */}
        <header className="olp-header">
          <p className="olp-eyebrow">
            {user ? `Olá, ${user.name.split(' ')[0]}` : 'Rastreamento'}
          </p>
          <h1 className="olp-title">
            {user ? 'Seus pedidos' : 'Acompanhe seu pedido'}
          </h1>
          {!user && (
            <p className="olp-subtitle">
              Informe seu e-mail e CPF cadastrados para visualizar seus pedidos.
            </p>
          )}
          {user && orders && orders.length > 0 && (
            <p className="olp-subtitle">
              {orders.length} {orders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
            </p>
          )}
        </header>

        {/* ── LOGGED-IN: auto state ── */}
        {user && (
          <>
            {loading && (
              <div className="olp-states">
                {[1, 2].map((i) => (
                  <div key={i} className="olp-skeleton-card">
                    <div className="olp-skeleton-bar" style={{ width: '30%', height: 11 }} />
                    <div className="olp-skeleton-bar" style={{ width: '55%', height: 20, marginTop: 10 }} />
                    <div className="olp-skeleton-bar" style={{ width: '100%', height: 1, marginTop: 20 }} />
                    <div className="olp-skeleton-bar" style={{ width: '80%', height: 13, marginTop: 16 }} />
                    <div className="olp-skeleton-bar" style={{ width: '60%', height: 13, marginTop: 8 }} />
                  </div>
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="olp-empty">
                <div className="olp-empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className="olp-empty-text">{error}</p>
                <button
                  type="button"
                  className="olp-retry-btn"
                  onClick={() => {
                    if (!token) return;
                    setLoading(true);
                    setError('');
                    getMyOrders(token)
                      .then(setOrders)
                      .catch(() => setError('Não foi possível carregar seus pedidos.'))
                      .finally(() => setLoading(false));
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {!loading && !error && orders !== null && orders.length === 0 && (
              <div className="olp-empty">
                <div className="olp-empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <p className="olp-empty-title">Nenhum pedido ainda</p>
                <p className="olp-empty-text">Quando você fizer seu primeiro pedido, ele aparecerá aqui.</p>
                <Link to="/" className="olp-shop-btn">Explorar a coleção</Link>
              </div>
            )}

            {!loading && !error && orders && orders.length > 0 && (
              <div className="olp-order-list">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── GUEST: lookup form ── */}
        {!user && (
          <>
            <div className="olp-guest-wrap">
              {/* Login CTA */}
              <div className="olp-login-cta">
                <div className="olp-login-cta-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="olp-login-cta-body">
                  <p className="olp-login-cta-title">Tem uma conta? Acesse para ver todos os seus pedidos automaticamente.</p>
                  <Link to="/entrar" className="olp-login-link">Entrar na conta →</Link>
                </div>
              </div>

              <div className="olp-divider">
                <span>ou consulte como visitante</span>
              </div>

              {/* Guest form */}
              <form className="olp-form" onSubmit={handleGuestLookup}>
                <div className="olp-field">
                  <label className="olp-label" htmlFor="lookup-email">E-mail</label>
                  <input
                    id="lookup-email"
                    className="olp-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="olp-field">
                  <label className="olp-label" htmlFor="lookup-cpf">CPF</label>
                  <input
                    id="lookup-cpf"
                    className="olp-input"
                    type="text"
                    inputMode="numeric"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </div>
                <button type="submit" className="olp-submit-btn" disabled={loading}>
                  {loading ? (
                    <span className="olp-spinner" aria-hidden="true" />
                  ) : null}
                  {loading ? 'Buscando...' : 'Consultar pedidos'}
                </button>
              </form>

              {error && <p className="olp-error">{error}</p>}
            </div>

            {orders && orders.length > 0 && (
              <div className="olp-order-list" style={{ marginTop: 48 }}>
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}
