import { useEffect, useState } from 'react';
import axios from 'axios';

interface AdminOrder {
  id: string;
  status: string;
  paymentMethod: string | null;
  total: number;
  createdAt: string;
  guestName: string | null;
  guestEmail: string | null;
  shippingMethod: string | null;
  trackingCode: string | null;
  itemCount: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando',
  PAID: 'Pago',
  PREPARING: 'Em preparo',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  OVERDUE: 'Vencido',
  REFUNDED: 'Reembolsado',
};

const ALL_STATUSES = ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://magic-ecomerce-api-731025483706.us-central1.run.app';

function formatCurrency(value: number | string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminOrdersPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    shippingMethod: '',
    trackingCode: '',
    trackingUrl: '',
    note: '',
  });
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState('');

  function authHeaders() {
    return { 'x-admin-key': adminKey };
  }

  async function fetchOrders() {
    setLoading(true);
    setError('');
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const { data } = await axios.get(`${API_BASE}/admin/orders`, {
        headers: authHeaders(),
        params,
      });
      setOrders(data.orders || []);
    } catch {
      setError('Erro ao carregar pedidos. Verifique a chave de admin.');
    } finally {
      setLoading(false);
    }
  }

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthenticated(true);
  }

  useEffect(() => {
    if (authenticated) void fetchOrders();
  }, [authenticated, filterStatus]);

  function openOrder(order: AdminOrder) {
    setSelected(order);
    setUpdateForm({
      status: order.status,
      shippingMethod: order.shippingMethod || '',
      trackingCode: order.trackingCode || '',
      trackingUrl: '',
      note: '',
    });
    setUpdateSuccess('');
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setUpdating(true);
    setUpdateSuccess('');

    try {
      await axios.patch(
        `${API_BASE}/admin/orders/${selected.id}`,
        {
          status: updateForm.status || undefined,
          shippingMethod: updateForm.shippingMethod || undefined,
          trackingCode: updateForm.trackingCode || undefined,
          trackingUrl: updateForm.trackingUrl || undefined,
          note: updateForm.note || undefined,
        },
        { headers: authHeaders() }
      );
      setUpdateSuccess('Pedido atualizado!');
      void fetchOrders();
    } catch {
      setUpdateSuccess('Erro ao atualizar pedido.');
    } finally {
      setUpdating(false);
    }
  }

  if (!authenticated) {
    return (
      <main className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <p className="section-label-inline">Painel</p>
            <h1 className="auth-title">Admin — Pedidos</h1>
          </div>
          <form className="auth-form" onSubmit={handleAuth}>
            <div className="form-group">
              <label htmlFor="admin-key">Chave de acesso</label>
              <input
                id="admin-key"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="x-admin-key"
                required
              />
            </div>
            <button type="submit" className="btn-primary auth-submit">Acessar</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-orders-page">
      <div className="admin-orders-container">
        <div className="admin-orders-header">
          <div>
            <p className="section-label-inline">Gestão</p>
            <h1 className="admin-orders-title">Pedidos</h1>
          </div>
          <div className="admin-filter-row">
            <select
              className="admin-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p className="status">Carregando...</p>}
        {error && <p className="lookup-error">{error}</p>}

        {!loading && !error && orders.length === 0 && (
          <p className="status">Nenhum pedido encontrado.</p>
        )}

        {orders.length > 0 && (
          <div className="admin-orders-table-wrap">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Itens</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Envio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>#{o.id.slice(0, 8).toUpperCase()}</td>
                    <td>{formatDate(o.createdAt)}</td>
                    <td>
                      <div>{o.guestName || '—'}</div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>{o.guestEmail || ''}</div>
                    </td>
                    <td>{o.itemCount}</td>
                    <td>{formatCurrency(o.total)}</td>
                    <td>
                      <span className={`order-status-badge status-${o.status.toLowerCase()}`}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    </td>
                    <td>{o.shippingMethod || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => openOrder(o)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit panel */}
        {selected && (
          <div className="admin-order-edit-overlay" onClick={() => setSelected(null)}>
            <div className="admin-order-edit-panel" onClick={(e) => e.stopPropagation()}>
              <div className="admin-order-edit-header">
                <h2>Pedido #{selected.id.slice(0, 8).toUpperCase()}</h2>
                <button type="button" className="icon-btn" onClick={() => setSelected(null)}>✕</button>
              </div>

              <p style={{ marginBottom: 16, opacity: 0.7 }}>
                {selected.guestName} · {formatCurrency(selected.total)}
              </p>

              <form onSubmit={handleUpdate} className="auth-form">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    className="admin-filter-select"
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Método de envio</label>
                  <select
                    className="admin-filter-select"
                    value={updateForm.shippingMethod}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, shippingMethod: e.target.value }))}
                  >
                    <option value="">Não definido</option>
                    <option value="CORREIOS">Correios</option>
                    <option value="UBER">Uber Flash</option>
                    <option value="PICKUP">Retirada na loja</option>
                  </select>
                </div>

                {updateForm.shippingMethod === 'CORREIOS' && (
                  <div className="form-group">
                    <label>Código de rastreio (Correios)</label>
                    <input
                      type="text"
                      value={updateForm.trackingCode}
                      onChange={(e) => setUpdateForm((f) => ({ ...f, trackingCode: e.target.value }))}
                      placeholder="AA123456789BR"
                    />
                  </div>
                )}

                {updateForm.shippingMethod === 'UBER' && (
                  <div className="form-group">
                    <label>Link de rastreio (Uber)</label>
                    <input
                      type="url"
                      value={updateForm.trackingUrl}
                      onChange={(e) => setUpdateForm((f) => ({ ...f, trackingUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Nota (opcional)</label>
                  <input
                    type="text"
                    value={updateForm.note}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Ex: Entregue ao porteiro"
                  />
                </div>

                {updateSuccess && (
                  <p className={updateSuccess.includes('Erro') ? 'lookup-error' : 'lookup-success'}>
                    {updateSuccess}
                  </p>
                )}

                <button type="submit" className="btn-primary auth-submit" disabled={updating}>
                  {updating ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
