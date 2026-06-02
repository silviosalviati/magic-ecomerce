import axios from 'axios';
import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { ADMIN_API, useAdmin } from '../contexts/AdminContext';
import { formatCurrencyBRL, formatIntegerBR } from '../lib/numberFormat';

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

interface AdminOrderDetail {
  id: string;
  items: Array<{
    id: string;
    quantity: number;
    priceAtPurchase: number;
    variant: {
      color: string;
      size: string;
      barcode: string | null;
      product: { name: string };
    };
  }>;
  statusUpdates: Array<{
    id: string;
    status: string;
    note: string | null;
    createdAt: string;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando', PAID: 'Pago', PREPARING: 'Em preparo',
  SHIPPED: 'Enviado', DELIVERED: 'Entregue', CANCELLED: 'Cancelado',
  OVERDUE: 'Vencido', REFUNDED: 'Reembolsado',
};

const ALL_STATUSES = ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'OVERDUE', 'REFUNDED'];

function formatCurrency(value: number | string) {
  return formatCurrencyBRL(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AdminOrdersPage() {
  const { headers } = useAdmin();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AdminOrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: '', shippingMethod: '', trackingCode: '', trackingUrl: '', note: '' });
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  async function fetchOrders() {
    setLoading(true);
    setError('');
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const { data } = await axios.get(`${ADMIN_API}/admin/orders`, { headers, params });
      setOrders(data.orders || []);
    } catch {
      setError('Erro ao carregar pedidos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchOrders(); }, [filterStatus]);

  async function openOrder(order: AdminOrder) {
    setSelected(order);
    setSelectedDetail(null);
    setLoadingDetail(true);
    setUpdateForm({ status: order.status, shippingMethod: order.shippingMethod || '', trackingCode: order.trackingCode || '', trackingUrl: '', note: '' });
    setUpdateMsg('');

    try {
      const { data } = await axios.get<AdminOrderDetail>(`${ADMIN_API}/admin/orders/${order.id}`, { headers });
      setSelectedDetail(data);
    } catch {
      setUpdateMsg('Não foi possível carregar os itens do pedido.');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setUpdating(true);
    setUpdateMsg('');
    try {
      await axios.patch(
        `${ADMIN_API}/admin/orders/${selected.id}`,
        {
          status: updateForm.status || undefined,
          shippingMethod: updateForm.shippingMethod || undefined,
          trackingCode: updateForm.trackingCode || undefined,
          trackingUrl: updateForm.trackingUrl || undefined,
          note: updateForm.note || undefined,
        },
        { headers }
      );
      setUpdateMsg('Pedido atualizado com sucesso.');
      void fetchOrders();
    } catch {
      setUpdateMsg('Erro ao atualizar pedido.');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <AdminLayout title="Pedidos">
      {/* Toolbar */}
      <div className="adm-toolbar">
        <select
          className="adm-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
          ))}
        </select>

        <p style={{ fontFamily: 'Arial,sans-serif', fontSize: 12, color: '#6B5F5C', marginLeft: 'auto' }}>
          {formatIntegerBR(orders.length)} pedido(s)
        </p>
      </div>

      {error && <p className="adm-message adm-message--error">{error}</p>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <span className="adm-spinner" />
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
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
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{o.id.slice(0, 8).toUpperCase()}</td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td>
                    <p className="adm-table-name">{o.guestName || '—'}</p>
                    <p className="adm-table-sub">{o.guestEmail || ''}</p>
                  </td>
                  <td>{o.itemCount}</td>
                  <td>{formatCurrency(o.total)}</td>
                  <td>
                    <span className={`adm-badge adm-badge--${o.status.toLowerCase()}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                  <td>{o.shippingMethod || '—'}</td>
                  <td>
                    <button type="button" className="adm-table-btn" onClick={() => void openOrder(o)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {orders.length === 0 && (
            <div className="adm-empty" style={{ padding: '48px 20px' }}>
              <p className="adm-empty-title">Nenhum pedido encontrado</p>
            </div>
          )}
        </div>
      )}

      {/* Edit panel */}
      {selected && (
        <div className="adm-panel-overlay" onClick={() => setSelected(null)}>
          <div className="adm-panel" onClick={(e) => e.stopPropagation()}>
            <div className="adm-panel-hd">
              <h2 className="adm-panel-title">#{selected.id.slice(0, 8).toUpperCase()}</h2>
              <button type="button" className="adm-panel-close" onClick={() => setSelected(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="adm-panel-body">
              <p style={{ fontFamily: 'Arial,sans-serif', fontSize: 13, color: '#9A8D87', margin: '0 0 20px' }}>
                {selected.guestName} · {formatCurrency(selected.total)}
              </p>

              <form onSubmit={handleUpdate}>
                <div className="adm-field">
                  <label className="adm-label">Status</label>
                  <select
                    className="adm-select"
                    style={{ width: '100%', padding: '11px 14px' }}
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                    ))}
                  </select>
                </div>

                <div className="adm-field">
                  <label className="adm-label">Método de envio</label>
                  <select
                    className="adm-select"
                    style={{ width: '100%', padding: '11px 14px' }}
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
                  <div className="adm-field">
                    <label className="adm-label">Código de rastreio</label>
                    <input
                      type="text"
                      className="adm-input"
                      value={updateForm.trackingCode}
                      onChange={(e) => setUpdateForm((f) => ({ ...f, trackingCode: e.target.value }))}
                      placeholder="AA123456789BR"
                    />
                  </div>
                )}

                {updateForm.shippingMethod === 'UBER' && (
                  <div className="adm-field">
                    <label className="adm-label">Link de rastreio (Uber)</label>
                    <input
                      type="url"
                      className="adm-input"
                      value={updateForm.trackingUrl}
                      onChange={(e) => setUpdateForm((f) => ({ ...f, trackingUrl: e.target.value }))}
                      placeholder="https://…"
                    />
                  </div>
                )}

                <div className="adm-field">
                  <label className="adm-label">Nota interna</label>
                  <input
                    type="text"
                    className="adm-input"
                    value={updateForm.note}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Ex: Entregue ao porteiro"
                  />
                </div>

                {updateMsg && (
                  <p className={`adm-message ${updateMsg.includes('Erro') ? 'adm-message--error' : 'adm-message--success'}`}>
                    {updateMsg}
                  </p>
                )}

                <button type="submit" className="adm-btn adm-btn--primary" disabled={updating}>
                  {updating
                    ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 13, height: 13 }} />
                    : 'Salvar alterações'}
                </button>
              </form>

              <div style={{ marginTop: 22, borderTop: '0.5px solid #1E1E1E', paddingTop: 16 }}>
                <p className="adm-low-stock-title" style={{ margin: 0, marginBottom: 10 }}>Itens vendidos</p>

                {loadingDetail && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 10 }}>
                    <span className="adm-spinner" />
                  </div>
                )}

                {!loadingDetail && selectedDetail && selectedDetail.items.length === 0 && (
                  <p className="adm-table-sub" style={{ margin: 0 }}>Sem itens vinculados.</p>
                )}

                {!loadingDetail && selectedDetail && selectedDetail.items.length > 0 && (
                  <div className="adm-table-wrap" style={{ marginTop: 0 }}>
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Variação</th>
                          <th>Qtd.</th>
                          <th>Unitário</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetail.items.map((item) => {
                          const subtotal = Number(item.priceAtPurchase) * Number(item.quantity);
                          return (
                            <tr key={item.id}>
                              <td>
                                <p className="adm-table-name">{item.variant.product.name}</p>
                                <p className="adm-table-sub">{item.variant.barcode || 'Sem código'}</p>
                              </td>
                              <td>{item.variant.color} · {item.variant.size}</td>
                              <td>{formatIntegerBR(item.quantity)}</td>
                              <td>{formatCurrency(item.priceAtPurchase)}</td>
                              <td>{formatCurrency(subtotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="adm-low-stock-title" style={{ marginTop: 16, marginBottom: 10 }}>Histórico de status</p>
                {!loadingDetail && selectedDetail && selectedDetail.statusUpdates.length === 0 && (
                  <p className="adm-table-sub" style={{ margin: 0 }}>Sem atualizações registradas.</p>
                )}
                {!loadingDetail && selectedDetail && selectedDetail.statusUpdates.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedDetail.statusUpdates.map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          border: '0.5px solid #1E1E1E',
                          padding: '9px 11px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontFamily: 'Arial,sans-serif', fontSize: 12 }}>{STATUS_LABELS[entry.status] || entry.status}</span>
                        <span style={{ fontFamily: 'Arial,sans-serif', fontSize: 11, color: '#9A8D87' }}>
                          {formatDate(entry.createdAt)}{entry.note ? ` · ${entry.note}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
