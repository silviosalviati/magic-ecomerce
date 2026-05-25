import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMyOrders } from '../lib/api';
import { OrderCard } from '../components/OrderCard';
import type { Order } from '../types';

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
      .catch(() => setError('Erro ao carregar pedidos.'))
      .finally(() => setLoadingOrders(false));
  }, [token]);

  if (authLoading) {
    return (
      <main className="auth-page">
        <div className="auth-container">
          <div className="product-grid">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: 120 }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!user) return <Navigate to="/entrar" state={{ from: '/minha-conta' }} replace />;

  return (
    <main className="account-page">
      <div className="account-container">
        <div className="account-header">
          <div>
            <p className="section-label-inline">Minha conta</p>
            <h1 className="account-title">Olá, {user.name.split(' ')[0]}</h1>
            <p className="account-email">{user.email}</p>
          </div>
          <div className="account-actions">
            <Link to="/rastrear-pedido" className="btn-outline">
              Rastrear sem login
            </Link>
            <button type="button" className="btn-ghost" onClick={logout}>
              Sair
            </button>
          </div>
        </div>

        <section className="account-orders">
          <h2 className="account-section-title">Meus pedidos</h2>

          {loadingOrders && (
            <div className="order-list">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="skeleton-card" style={{ height: 160 }} />
              ))}
            </div>
          )}

          {error && <p className="lookup-error">{error}</p>}

          {!loadingOrders && !error && orders.length === 0 && (
            <div className="account-empty">
              <p>Nenhum pedido encontrado.</p>
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
        </section>
      </div>
    </main>
  );
}
