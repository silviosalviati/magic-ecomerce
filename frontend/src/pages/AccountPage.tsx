import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMyOrders } from '../lib/api';
import { formatCurrencyBRL } from '../lib/numberFormat';
import { OrderCard } from '../components/OrderCard';
import { SEO } from '../components/SEO';
import type { Order } from '../types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function sumOrders(orders: Order[]): string {
  const total = orders.reduce((acc, o) => acc + Number(o.total), 0);
  return formatCurrencyBRL(total);
}

export function AccountPage() {
  const { user, token, loading: authLoading, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoadingOrders(true);
    getMyOrders(token)
      .then(setOrders)
      .catch(() => setError('Ainda não encontramos pedidos para esta conta.'))
      .finally(() => setLoadingOrders(false));
  }, [token]);

  if (authLoading) {
    return (
      <main className="account-page">
        <div className="acc-hero acc-hero--loading">
          <div className="acc-hero-inner">
            <div className="skeleton-circle" />
            <div className="acc-hero-info">
              <div className="skeleton-line" style={{ width: 80, height: 11, marginBottom: 10 }} />
              <div className="skeleton-line" style={{ width: 220, height: 38, marginBottom: 10 }} />
              <div className="skeleton-line" style={{ width: 160, height: 13 }} />
            </div>
          </div>
        </div>
        <div className="account-container">
          <div className="order-list" style={{ marginTop: 40 }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: 200, background: 'var(--color-bg-card)', animation: 'shimmer 1.4s ease-in-out infinite', backgroundImage: 'linear-gradient(90deg, var(--color-bg-deep) 25%, var(--color-bg-card) 50%, var(--color-bg-deep) 75%)', backgroundSize: '600px 100%' }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!user) return <Navigate to="/entrar" state={{ from: '/minha-conta' }} replace />;

  const initials = getInitials(user.name);
  const firstName = user.name.split(' ')[0];

  return (
    <main className="account-page">
      <SEO title="Minha Conta" noindex />
      {/* ── Profile Hero ── */}
      <header className="acc-hero">
        <div className="acc-hero-glow" aria-hidden="true" />
        <div className="acc-hero-inner">
          <div className="acc-avatar">{initials}</div>
          <div className="acc-hero-info">
            <p className="acc-hero-eyebrow">Minha conta</p>
            <h1 className="acc-hero-name">Olá, {firstName}</h1>
            <p className="acc-hero-email">{user.email}</p>
            {!loadingOrders && orders.length > 0 && (
              <div className="acc-stats">
                <div className="acc-stat">
                  <span className="acc-stat-num">{orders.length}</span>
                  <span className="acc-stat-lbl">{orders.length === 1 ? 'pedido' : 'pedidos'}</span>
                </div>
                <span className="acc-stat-sep" aria-hidden="true">·</span>
                <div className="acc-stat">
                  <span className="acc-stat-num acc-stat-num--mono">{sumOrders(orders)}</span>
                  <span className="acc-stat-lbl">em compras</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="acc-hero-actions">
          <Link to="/rastrear-pedido" className="btn-outline acc-btn-track">
            Rastrear sem login
          </Link>
          <button type="button" className="acc-logout" onClick={logout}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair
          </button>
        </div>
      </header>

      {/* ── Orders section ── */}
      <div className="account-container">
        <div className="acc-orders-header">
          <h2 className="acc-orders-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            Meus pedidos
          </h2>
        </div>

        {loadingOrders && (
          <div className="order-list">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: 200, background: 'var(--color-bg-card)', animation: 'shimmer 1.4s ease-in-out infinite', backgroundImage: 'linear-gradient(90deg, var(--color-bg-deep) 25%, var(--color-bg-card) 50%, var(--color-bg-deep) 75%)', backgroundSize: '600px 100%' }} />
            ))}
          </div>
        )}

        {error && <p className="lookup-error">{error}</p>}

        {!loadingOrders && !error && orders.length === 0 && (
          <div className="acc-empty">
            <div className="acc-empty-icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <p className="acc-empty-title">Nenhum pedido ainda</p>
            <p className="acc-empty-sub">Explore nossa coleção e faça seu primeiro pedido.</p>
            <Link to="/" className="btn-primary">
              Explorar coleção
            </Link>
          </div>
        )}

        {!loadingOrders && orders.length > 0 && (
          <div className="order-list">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}