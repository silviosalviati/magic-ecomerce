import { useState } from 'react';
import { lookupOrders } from '../lib/api';
import type { Order } from '../types';
import { OrderCard } from '../components/OrderCard';

export function OrderLookupPage() {
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <main className="order-lookup-page">
      <div className="order-lookup-container">
        <div className="order-lookup-header">
          <p className="section-label-inline">Rastreamento</p>
          <h1 className="order-lookup-title">Acompanhe seu pedido</h1>
          <p className="order-lookup-subtitle">
            Informe seu e-mail e CPF para consultar o status dos seus pedidos.
          </p>
        </div>

        <form className="order-lookup-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="lookup-email">E-mail</label>
            <input
              id="lookup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="lookup-cpf">CPF</label>
            <input
              id="lookup-cpf"
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              maxLength={14}
              required
            />
          </div>
          <button type="submit" className="btn-primary lookup-submit" disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar pedidos'}
          </button>
        </form>

        {error && <p className="lookup-error">{error}</p>}

        {orders && orders.length > 0 && (
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
