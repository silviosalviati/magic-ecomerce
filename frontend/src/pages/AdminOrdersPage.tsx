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
  shippingLabel?: string | null;
  trackingCode: string | null;
  itemCount: number;
}

interface AdminOrderDetail {
  id: string;
  shippingMethod: string | null;
  shippingLabel: string | null;
  shippingCost: number | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  paymentMethod: string | null;
  total: number;
  guestName: string | null;
  guestEmail: string | null;
  guestCpf: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
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
  PENDING: 'Aguardando', PAID: 'Pago', PREPARING: 'Em separação',
  SHIPPED: 'Enviado', DELIVERED: 'Entregue', CANCELLED: 'Cancelado',
  OVERDUE: 'Vencido', REFUNDED: 'Reembolsado',
};

const SHIPPING_LABELS: Record<string, string> = {
  PAC: 'Correios (PAC)',
  SEDEX: 'Correios (SEDEX)',
  CORREIOS: 'Correios', UBER: 'Uber Flash', PICKUP: 'Retirada na loja',
};

const ALL_STATUSES = ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'OVERDUE', 'REFUNDED'];
const AUTO_REFRESH_INTERVAL_MS = 15000;

function formatCurrency(value: number | string) { return formatCurrencyBRL(value); }

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatZip(zip: string | null | undefined) {
  if (!zip) return '';
  const d = zip.replace(/\D/g, '');
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : zip;
}

function correiosServiceTag(label: string | null | undefined) {
  if (!label) return null;
  const up = label.toUpperCase();
  if (up.includes('SEDEX')) return 'SEDEX';
  if (up.includes('PAC')) return 'PAC';
  if (up.includes('MINI')) return 'Mini Envios';
  return null;
}

/* ─── Icons ──────────────────────────────────────────────────── */
function IconSave() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}
function IconSync() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
function IconTruck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13"/>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
}

/* ─── Workflow step labels ────────────────────────────────────── */
function getWorkflowSteps(shippingMethod: string) {
  const isPickup = shippingMethod === 'PICKUP';
  return [
    { status: 'PAID',      label: 'Pago' },
    { status: 'PREPARING', label: 'Em separação' },
    { status: 'SHIPPED',   label: isPickup ? 'Pronto p/ retirada' : 'Enviado' },
    { status: 'DELIVERED', label: isPickup ? 'Retirado' : 'Entregue' },
  ];
}

const WORKFLOW_IDX: Record<string, number> = {
  PENDING: -1, PAID: 0, PREPARING: 1, SHIPPED: 2, DELIVERED: 3,
};

/* ─── Main component ──────────────────────────────────────────── */
export function AdminOrdersPage() {
  const { headers } = useAdmin();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AdminOrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Manual edit form
  const [updateForm, setUpdateForm] = useState({ status: '', shippingMethod: '', trackingCode: '', trackingUrl: '', note: '' });
  const [updating, setUpdating] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  // Workflow advance form
  const [actionForm, setActionForm] = useState({ trackingCode: '', trackingUrl: '', note: '' });
  const [advancing, setAdvancing] = useState(false);
  const [actionError, setActionError] = useState('');

  async function fetchOrders(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
    }
    setError('');
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const { data } = await axios.get(`${ADMIN_API}/admin/orders`, { headers, params });
      setOrders(data.orders || []);
    } catch { setError('Erro ao carregar pedidos.'); }
    finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void fetchOrders();

    const refreshOrders = () => {
      if (document.visibilityState !== 'visible') return;
      void fetchOrders({ silent: true });
    };

    const intervalId = window.setInterval(refreshOrders, AUTO_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', refreshOrders);
    document.addEventListener('visibilitychange', refreshOrders);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshOrders);
      document.removeEventListener('visibilitychange', refreshOrders);
    };
  }, [filterStatus, headers]);

  async function openOrder(order: AdminOrder) {
    setSelected(order);
    setSelectedDetail(null);
    setLoadingDetail(true);
    setUpdateForm({ status: order.status, shippingMethod: order.shippingMethod || '', trackingCode: order.trackingCode || '', trackingUrl: '', note: '' });
    setUpdateMsg('');
    setActionForm({ trackingCode: order.trackingCode || '', trackingUrl: '', note: '' });
    setActionError('');

    try {
      const { data } = await axios.get<AdminOrderDetail>(`${ADMIN_API}/admin/orders/${order.id}`, { headers });
      setSelectedDetail(data);
      setUpdateForm((f) => ({
        ...f,
        shippingMethod: data.shippingMethod || f.shippingMethod,
        trackingCode: data.trackingCode || f.trackingCode,
        trackingUrl: data.trackingUrl || '',
      }));
      setActionForm((f) => ({
        ...f,
        trackingCode: data.trackingCode || '',
        trackingUrl: data.trackingUrl || '',
      }));
    } catch { setUpdateMsg('Não foi possível carregar os itens do pedido.'); }
    finally { setLoadingDetail(false); }
  }

  // Advance through the lifecycle with the right fields
  async function advanceOrder(
    nextStatus: string,
    opts: { requireTracking?: boolean; requireUrl?: boolean } = {}
  ) {
    if (!selected) return;
    if (opts.requireTracking && !actionForm.trackingCode.trim()) {
      setActionError('Informe o código de rastreio antes de continuar.'); return;
    }
    if (opts.requireUrl && !actionForm.trackingUrl.trim()) {
      setActionError('Informe o link de rastreio Uber antes de continuar.'); return;
    }
    setAdvancing(true); setActionError('');
    try {
      const note = actionForm.note.trim();
      await axios.patch(`${ADMIN_API}/admin/orders/${selected.id}`, {
        status: nextStatus,
        trackingCode: actionForm.trackingCode.trim() || undefined,
        trackingUrl: actionForm.trackingUrl.trim() || undefined,
        note: note || undefined,
      }, { headers });
      setActionForm({ trackingCode: '', trackingUrl: '', note: '' });
      void fetchOrders();
      await openOrder({ ...selected, status: nextStatus });
    } catch { setActionError('Erro ao avançar pedido.'); }
    finally { setAdvancing(false); }
  }

  async function reconcilePayment() {
    if (!selected) return;
    setReconciling(true); setUpdateMsg('');
    try {
      const { data } = await axios.post(`${ADMIN_API}/admin/orders/${selected.id}/reconcile-payment`, {}, { headers });
      if (data?.updated) {
        setUpdateForm((f) => ({ ...f, status: data.status || f.status }));
        setUpdateMsg('Pagamento reconciliado com sucesso.');
      } else {
        setUpdateMsg('Pedido já estava com o status correto.');
      }
      await fetchOrders();
      await openOrder({ ...selected, status: data?.status || selected.status });
    } catch { setUpdateMsg('Erro ao reconciliar pagamento.'); }
    finally { setReconciling(false); }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setUpdating(true); setUpdateMsg('');
    try {
      await axios.patch(`${ADMIN_API}/admin/orders/${selected.id}`, {
        status: updateForm.status || undefined,
        shippingMethod: updateForm.shippingMethod || undefined,
        trackingCode: updateForm.trackingCode || undefined,
        trackingUrl: updateForm.trackingUrl || undefined,
        note: updateForm.note || undefined,
      }, { headers });
      setUpdateMsg('Pedido atualizado com sucesso.');
      void fetchOrders();
    } catch { setUpdateMsg('Erro ao atualizar pedido.'); }
    finally { setUpdating(false); }
  }

  /* ─── Render ──────────────────────────────────────────────── */
  return (
    <AdminLayout title="Pedidos">
      <div className="adm-toolbar">
        <select className="adm-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
        </select>
        <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 12, color: '#6B5F5C', marginLeft: 'auto' }}>
          {formatIntegerBR(orders.length)} pedido(s)
        </p>
      </div>

      {error && <p className="adm-message adm-message--error">{error}</p>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="adm-spinner" /></div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Pedido</th><th>Data</th><th>Cliente</th>
                <th>Itens</th><th>Total</th><th>Status</th><th>Envio</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => void openOrder(o)}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#C8C0BC', borderBottom: '0.5px solid rgba(200,192,188,0.3)', paddingBottom: 1 }}>
                      #{o.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td>
                    <p className="adm-table-name">{o.guestName || '—'}</p>
                    <p className="adm-table-sub">{o.guestEmail || ''}</p>
                  </td>
                  <td>{o.itemCount}</td>
                  <td>{formatCurrency(o.total)}</td>
                  <td><span className={`adm-badge adm-badge--${o.status.toLowerCase()}`}>{STATUS_LABELS[o.status] || o.status}</span></td>
                  <td>{SHIPPING_LABELS[o.shippingMethod || ''] || o.shippingMethod || '—'}</td>
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

      {/* ══════════════════ PANEL ══════════════════════════════ */}
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
              <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 13, color: '#9A8D87', margin: '0 0 20px' }}>
                {selected.guestName} · {formatCurrency(selected.total)}
              </p>

              {/* ── CICLO DO PEDIDO ──────────────────────────── */}
              {(() => {
                const st = selected.status;
                const sm = selectedDetail?.shippingMethod || selected.shippingMethod || '';
                const isPickup   = sm === 'PICKUP';
                const isCorreios = sm === 'CORREIOS' || sm === 'PAC' || sm === 'SEDEX';
                const isUber     = sm === 'UBER';
                const isTerminal = ['CANCELLED', 'OVERDUE', 'REFUNDED'].includes(st);
                const wfSteps    = getWorkflowSteps(sm);
                const currentIdx = WORKFLOW_IDX[st] ?? -1;

                return (
                  <div style={{ marginBottom: 22, paddingBottom: 22, borderBottom: '0.5px solid #1E1E1E' }}>
                    {/* Section label */}
                    <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4A4040', margin: '0 0 14px' }}>
                      Ciclo do pedido
                    </p>

                    {/* Stepper */}
                    {!isTerminal && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
                        {wfSteps.map((step, i) => {
                          const done    = i <= currentIdx;
                          const current = false;
                          const lineDone = i < currentIdx;
                          return (
                            <div key={step.status} style={{ display: 'flex', alignItems: 'flex-start', flex: i < wfSteps.length - 1 ? 1 : 0 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                <div style={{
                                  width: 20, height: 20, borderRadius: '50%',
                                  background: done ? '#5BA882' : current ? '#C8C0BC' : 'transparent',
                                  border: done || current ? 'none' : '0.5px solid #2A2A2A',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                  {current && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0A0A0A' }} />}
                                </div>
                                <span style={{ fontFamily: "var(--adm-font-ui)", fontSize: 9, color: done ? '#5BA882' : current ? '#C8C0BC' : '#3A3A3A', marginTop: 5, textAlign: 'center', lineHeight: 1.3, maxWidth: 52 }}>
                                  {step.label}
                                </span>
                              </div>
                              {i < wfSteps.length - 1 && (
                                <div style={{ flex: 1, height: 1, background: lineDone ? '#5BA882' : '#1E1E1E', marginTop: 10, marginLeft: 3, marginRight: 3, flexShrink: 0, minWidth: 10 }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Terminal state */}
                    {isTerminal && (
                      <div style={{ fontFamily: "var(--adm-font-ui)", fontSize: 12, color: '#EF8BA0', marginBottom: 12 }}>
                        {STATUS_LABELS[st] || st}
                      </div>
                    )}

                    {/* ── Next action card ─────────────────── */}
                    {!isTerminal && (
                      <div style={{ background: 'rgba(255,255,255,0.025)', border: '0.5px solid #242424', padding: '14px 14px 12px' }}>

                        {/* PAID → PREPARING */}
                        {st === 'PAID' && (
                          <>
                            <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, fontWeight: 600, color: '#C8C0BC', margin: '0 0 10px' }}>
                              Iniciar separação do pedido
                            </p>
                            <div className="adm-field" style={{ marginBottom: 12 }}>
                              <label className="adm-label">Nota (opcional)</label>
                              <input type="text" className="adm-input" placeholder="Observação interna"
                                value={actionForm.note}
                                onChange={(e) => setActionForm((f) => ({ ...f, note: e.target.value }))} />
                            </div>
                            {actionError && <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#EF8BA0', margin: '0 0 10px' }}>{actionError}</p>}
                            <button type="button" className="adm-btn adm-btn--primary" style={{ width: '100%' }} disabled={advancing}
                              onClick={() => void advanceOrder('PREPARING')}>
                              {advancing ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 13, height: 13 }} />
                                : <><IconArrow />&nbsp;Iniciar separação</>}
                            </button>
                          </>
                        )}

                        {/* PREPARING + CORREIOS → SHIPPED */}
                        {st === 'PREPARING' && isCorreios && (
                          <>
                            <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, fontWeight: 600, color: '#C8C0BC', margin: '0 0 10px' }}>
                              Enviar pelos Correios
                            </p>
                            <div className="adm-field" style={{ marginBottom: 10 }}>
                              <label className="adm-label">
                                Código de rastreio
                                <span style={{ color: '#EF8BA0', marginLeft: 3 }}>*</span>
                              </label>
                              <input type="text" className="adm-input" placeholder="AA123456789BR"
                                value={actionForm.trackingCode}
                                onChange={(e) => setActionForm((f) => ({ ...f, trackingCode: e.target.value }))} />
                            </div>
                            <div className="adm-field" style={{ marginBottom: 12 }}>
                              <label className="adm-label">Nota (opcional)</label>
                              <input type="text" className="adm-input" placeholder="Ex: Postado na ag. central"
                                value={actionForm.note}
                                onChange={(e) => setActionForm((f) => ({ ...f, note: e.target.value }))} />
                            </div>
                            {actionError && <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#EF8BA0', margin: '0 0 10px' }}>{actionError}</p>}
                            <button type="button" className="adm-btn adm-btn--primary" style={{ width: '100%' }} disabled={advancing}
                              onClick={() => void advanceOrder('SHIPPED', { requireTracking: true })}>
                              {advancing ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 13, height: 13 }} />
                                : <><IconArrow />&nbsp;Marcar como enviado</>}
                            </button>
                          </>
                        )}

                        {/* PREPARING + UBER → SHIPPED */}
                        {st === 'PREPARING' && isUber && (
                          <>
                            <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, fontWeight: 600, color: '#C8C0BC', margin: '0 0 10px' }}>
                              Enviar via Uber Flash
                            </p>
                            <div className="adm-field" style={{ marginBottom: 10 }}>
                              <label className="adm-label">Link de rastreio Uber</label>
                              <input type="url" className="adm-input" placeholder="https://…"
                                value={actionForm.trackingUrl}
                                onChange={(e) => setActionForm((f) => ({ ...f, trackingUrl: e.target.value }))} />
                            </div>
                            <div className="adm-field" style={{ marginBottom: 12 }}>
                              <label className="adm-label">Nota (opcional)</label>
                              <input type="text" className="adm-input" placeholder="Ex: Saiu para entrega"
                                value={actionForm.note}
                                onChange={(e) => setActionForm((f) => ({ ...f, note: e.target.value }))} />
                            </div>
                            {actionError && <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#EF8BA0', margin: '0 0 10px' }}>{actionError}</p>}
                            <button type="button" className="adm-btn adm-btn--primary" style={{ width: '100%' }} disabled={advancing}
                              onClick={() => void advanceOrder('SHIPPED')}>
                              {advancing ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 13, height: 13 }} />
                                : <><IconArrow />&nbsp;Marcar como enviado</>}
                            </button>
                          </>
                        )}

                        {/* PREPARING + PICKUP → SHIPPED */}
                        {st === 'PREPARING' && isPickup && (
                          <>
                            <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, fontWeight: 600, color: '#C8C0BC', margin: '0 0 10px' }}>
                              Disponibilizar para retirada
                            </p>
                            <div className="adm-field" style={{ marginBottom: 12 }}>
                              <label className="adm-label">Nota (opcional)</label>
                              <input type="text" className="adm-input" placeholder="Ex: Pacote na prateleira 3"
                                value={actionForm.note}
                                onChange={(e) => setActionForm((f) => ({ ...f, note: e.target.value }))} />
                            </div>
                            {actionError && <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#EF8BA0', margin: '0 0 10px' }}>{actionError}</p>}
                            <button type="button" className="adm-btn adm-btn--primary" style={{ width: '100%' }} disabled={advancing}
                              onClick={() => void advanceOrder('SHIPPED')}>
                              {advancing ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 13, height: 13 }} />
                                : <><IconArrow />&nbsp;Disponibilizar para retirada</>}
                            </button>
                          </>
                        )}

                        {/* PREPARING (no shipping method set) → SHIPPED */}
                        {st === 'PREPARING' && !isCorreios && !isUber && !isPickup && (
                          <>
                            <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#9A8D87', margin: '0 0 10px' }}>
                              Configure o método de envio abaixo antes de avançar.
                            </p>
                          </>
                        )}

                        {/* SHIPPED + CORREIOS/UBER → DELIVERED */}
                        {st === 'SHIPPED' && !isPickup && (
                          <>
                            <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, fontWeight: 600, color: '#C8C0BC', margin: '0 0 10px' }}>
                              Confirmar entrega ao cliente
                            </p>
                            <div className="adm-field" style={{ marginBottom: 12 }}>
                              <label className="adm-label">Nota (opcional)</label>
                              <input type="text" className="adm-input" placeholder="Ex: Entregue ao porteiro, assinado por X"
                                value={actionForm.note}
                                onChange={(e) => setActionForm((f) => ({ ...f, note: e.target.value }))} />
                            </div>
                            {actionError && <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#EF8BA0', margin: '0 0 10px' }}>{actionError}</p>}
                            <button type="button" className="adm-btn adm-btn--primary" style={{ width: '100%' }} disabled={advancing}
                              onClick={() => void advanceOrder('DELIVERED')}>
                              {advancing ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 13, height: 13 }} />
                                : <><IconCheck />&nbsp;Confirmar entrega</>}
                            </button>
                          </>
                        )}

                        {/* SHIPPED + PICKUP → DELIVERED */}
                        {st === 'SHIPPED' && isPickup && (
                          <>
                            <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, fontWeight: 600, color: '#C8C0BC', margin: '0 0 10px' }}>
                              Confirmar retirada na loja
                            </p>
                            <div className="adm-field" style={{ marginBottom: 12 }}>
                              <label className="adm-label">Nota (opcional)</label>
                              <input type="text" className="adm-input" placeholder="Ex: Documento verificado"
                                value={actionForm.note}
                                onChange={(e) => setActionForm((f) => ({ ...f, note: e.target.value }))} />
                            </div>
                            {actionError && <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#EF8BA0', margin: '0 0 10px' }}>{actionError}</p>}
                            <button type="button" className="adm-btn adm-btn--primary" style={{ width: '100%' }} disabled={advancing}
                              onClick={() => void advanceOrder('DELIVERED')}>
                              {advancing ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 13, height: 13 }} />
                                : <><IconCheck />&nbsp;Confirmar retirada</>}
                            </button>
                          </>
                        )}

                        {/* DELIVERED */}
                        {st === 'DELIVERED' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#5BA882', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <span style={{ fontFamily: "var(--adm-font-ui)", fontSize: 12, color: '#5BA882' }}>
                              {isPickup ? 'Pedido retirado pelo cliente' : 'Pedido entregue ao cliente'}
                            </span>
                          </div>
                        )}

                        {/* PENDING */}
                        {st === 'PENDING' && (
                          <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#9A8D87', margin: 0 }}>
                            Aguardando confirmação de pagamento. Use "Reconciliar Asaas" para verificar o status no gateway.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── EDIÇÕES MANUAIS ──────────────────────────── */}
              <details style={{ marginBottom: 20 }}>
                <summary style={{ fontFamily: "var(--adm-font-ui)", fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4A4040', cursor: 'pointer', userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                  Edições manuais / correções
                </summary>

                <div style={{ paddingTop: 14 }}>
                  <form onSubmit={handleUpdate}>
                    <div className="adm-field">
                      <label className="adm-label">Status</label>
                      <select className="adm-select" style={{ width: '100%', padding: '11px 14px' }}
                        value={updateForm.status}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, status: e.target.value }))}>
                        {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
                      </select>
                    </div>

                    <div className="adm-field">
                      <label className="adm-label">
                        Método de envio
                        {selectedDetail?.shippingLabel && (
                          <span style={{ marginLeft: 8, fontFamily: "var(--adm-font-ui)", fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#7A9E8A', background: 'rgba(91,168,130,0.08)', border: '0.5px solid rgba(91,168,130,0.2)', padding: '2px 7px', borderRadius: 3 }}>
                            Cliente: {selectedDetail.shippingLabel}
                          </span>
                        )}
                      </label>
                      <select className="adm-select" style={{ width: '100%', padding: '11px 14px' }}
                        value={updateForm.shippingMethod}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, shippingMethod: e.target.value }))}>
                        <option value="">Não definido</option>
                        <option value="PAC">Correios (PAC)</option>
                        <option value="SEDEX">Correios (SEDEX)</option>
                        <option value="CORREIOS">Correios</option>
                        <option value="UBER">Uber Flash</option>
                        <option value="PICKUP">Retirada na loja</option>
                      </select>
                    </div>

                    {updateForm.shippingMethod === 'CORREIOS' && (
                      <div className="adm-field">
                        <label className="adm-label">Código de rastreio</label>
                        <input type="text" className="adm-input" placeholder="AA123456789BR"
                          value={updateForm.trackingCode}
                          onChange={(e) => setUpdateForm((f) => ({ ...f, trackingCode: e.target.value }))} />
                      </div>
                    )}

                    {updateForm.shippingMethod === 'UBER' && (
                      <div className="adm-field">
                        <label className="adm-label">Link de rastreio (Uber)</label>
                        <input type="url" className="adm-input" placeholder="https://…"
                          value={updateForm.trackingUrl}
                          onChange={(e) => setUpdateForm((f) => ({ ...f, trackingUrl: e.target.value }))} />
                      </div>
                    )}

                    <div className="adm-field">
                      <label className="adm-label">Nota interna</label>
                      <input type="text" className="adm-input" placeholder="Ex: Entregue ao porteiro"
                        value={updateForm.note}
                        onChange={(e) => setUpdateForm((f) => ({ ...f, note: e.target.value }))} />
                    </div>

                    {updateMsg && (
                      <p className={`adm-message ${updateMsg.includes('Erro') ? 'adm-message--error' : 'adm-message--success'}`}>{updateMsg}</p>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" className="adm-btn adm-btn--primary" style={{ flex: 1 }} disabled={updating}>
                        {updating
                          ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 13, height: 13 }} />
                          : <><IconSave />&nbsp;Salvar alterações</>}
                      </button>
                      <button type="button" className="adm-btn adm-btn--ghost" style={{ flex: 1 }} disabled={reconciling}
                        onClick={() => void reconcilePayment()}>
                        {reconciling
                          ? <span className="adm-spinner" style={{ width: 13, height: 13 }} />
                          : <><IconSync />&nbsp;Reconciliar Asaas</>}
                      </button>
                    </div>
                  </form>
                </div>
              </details>

              {/* ── ITENS VENDIDOS ───────────────────────────── */}
              <div style={{ marginTop: 4, borderTop: '0.5px solid #1E1E1E', paddingTop: 18 }}>
                <p className="adm-low-stock-title" style={{ margin: '0 0 12px' }}>Itens vendidos</p>

                {loadingDetail && <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><span className="adm-spinner" /></div>}
                {!loadingDetail && selectedDetail && selectedDetail.items.length === 0 && (
                  <p className="adm-table-sub" style={{ margin: 0 }}>Sem itens vinculados.</p>
                )}
                {!loadingDetail && selectedDetail && selectedDetail.items.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedDetail.items.map((item) => {
                      const subtotal = Number(item.priceAtPurchase) * Number(item.quantity);
                      return (
                        <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', padding: '11px 13px', background: 'rgba(255,255,255,0.022)', border: '0.5px solid #1E1E1E' }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 12, fontWeight: 600, color: '#C8C0BC', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.variant.product.name}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: "var(--adm-font-ui)", fontSize: 10, color: '#9A8D87', background: 'rgba(255,255,255,0.05)', border: '0.5px solid #2A2A2A', padding: '2px 6px' }}>{item.variant.color}</span>
                              <span style={{ fontFamily: "var(--adm-font-ui)", fontSize: 10, color: '#9A8D87', background: 'rgba(255,255,255,0.05)', border: '0.5px solid #2A2A2A', padding: '2px 6px' }}>{item.variant.size}</span>
                              {item.variant.barcode && <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#4A4040' }}>{item.variant.barcode}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 13, fontWeight: 600, color: '#C8C0BC', margin: '0 0 3px' }}>{formatCurrency(subtotal)}</p>
                            <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 10, color: '#6B5F5C', margin: 0 }}>{formatIntegerBR(item.quantity)} × {formatCurrency(item.priceAtPurchase)}</p>
                          </div>
                        </div>
                      );
                    })}
                    {selectedDetail.items.length > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 13px', borderTop: '0.5px solid #1E1E1E', marginTop: 2 }}>
                        <span style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#6B5F5C' }}>
                          {formatIntegerBR(selectedDetail.items.reduce((s, i) => s + Number(i.quantity), 0))} itens
                        </span>
                        <span style={{ fontFamily: "var(--adm-font-ui)", fontSize: 12, fontWeight: 600, color: '#C8C0BC' }}>
                          {formatCurrency(selectedDetail.items.reduce((s, i) => s + Number(i.priceAtPurchase) * Number(i.quantity), 0))}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── ENDEREÇO DE ENTREGA ──────────────────────── */}
              {!loadingDetail && selectedDetail && (selectedDetail.addressStreet || selectedDetail.addressCity) && (
                <div style={{ marginTop: 20, borderTop: '0.5px solid #1E1E1E', paddingTop: 18 }}>
                  <p className="adm-low-stock-title" style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconPin />Endereço de entrega
                  </p>
                  <div style={{ padding: '11px 13px', background: 'rgba(255,255,255,0.022)', border: '0.5px solid #1E1E1E', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {selectedDetail.guestName && (
                      <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 12, fontWeight: 600, color: '#C8C0BC', margin: 0 }}>
                        {selectedDetail.guestName}
                        {selectedDetail.guestCpf && <span style={{ fontWeight: 400, color: '#6B5F5C', marginLeft: 8 }}>CPF {selectedDetail.guestCpf}</span>}
                      </p>
                    )}
                    {selectedDetail.addressStreet && (
                      <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 12, color: '#9A8D87', margin: 0 }}>
                        {selectedDetail.addressStreet}, {selectedDetail.addressNumber || 'S/N'}
                        {selectedDetail.addressComplement ? ` — ${selectedDetail.addressComplement}` : ''}
                      </p>
                    )}
                    <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 12, color: '#9A8D87', margin: 0 }}>
                      {[selectedDetail.addressNeighborhood, selectedDetail.addressCity, selectedDetail.addressState].filter(Boolean).join(', ')}
                      {selectedDetail.addressZip ? ` · CEP ${formatZip(selectedDetail.addressZip)}` : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* ── INFORMAÇÕES DE ENVIO ─────────────────────── */}
              {!loadingDetail && selectedDetail && selectedDetail.shippingMethod && (
                <div style={{ marginTop: 20, borderTop: '0.5px solid #1E1E1E', paddingTop: 18 }}>
                  <p className="adm-low-stock-title" style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconTruck />Informações de envio
                  </p>
                  <div style={{ padding: '11px 13px', background: 'rgba(255,255,255,0.022)', border: '0.5px solid #1E1E1E', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedDetail.shippingMethod === 'CORREIOS' && (() => {
                      const service = correiosServiceTag(selectedDetail.shippingLabel);
                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: "var(--adm-font-ui)", fontSize: 12, fontWeight: 600, color: '#C8C0BC' }}>Correios</span>
                            {service && <span style={{ fontFamily: "var(--adm-font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#7A9E8A', background: 'rgba(91,168,130,0.08)', border: '0.5px solid rgba(91,168,130,0.25)', padding: '2px 8px' }}>{service}</span>}
                            {selectedDetail.shippingLabel && !service && <span style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#9A8D87' }}>{selectedDetail.shippingLabel}</span>}
                          </div>
                          {selectedDetail.shippingCost !== null && (
                            <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#6B5F5C', margin: 0 }}>
                              Frete: <span style={{ color: '#9A8D87' }}>{Number(selectedDetail.shippingCost) === 0 ? 'Grátis' : formatCurrency(selectedDetail.shippingCost)}</span>
                            </p>
                          )}
                          {selectedDetail.trackingCode ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#6B5F5C' }}>Rastreio:</span>
                              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#C8C0BC', background: 'rgba(255,255,255,0.04)', border: '0.5px solid #2A2A2A', padding: '3px 8px', letterSpacing: '0.05em' }}>{selectedDetail.trackingCode}</span>
                            </div>
                          ) : (
                            <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#4A4040', margin: 0, fontStyle: 'italic' }}>Código de rastreio ainda não informado</p>
                          )}
                        </>
                      );
                    })()}
                    {selectedDetail.shippingMethod === 'UBER' && (
                      <>
                        <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 12, fontWeight: 600, color: '#C8C0BC', margin: 0 }}>Uber Flash</p>
                        {selectedDetail.shippingCost !== null && (
                          <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#6B5F5C', margin: 0 }}>
                            Frete: <span style={{ color: '#9A8D87' }}>{Number(selectedDetail.shippingCost) === 0 ? 'Grátis' : formatCurrency(selectedDetail.shippingCost)}</span>
                          </p>
                        )}
                        {selectedDetail.trackingUrl
                          ? <a href={selectedDetail.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#7A9E8A', wordBreak: 'break-all' }}>{selectedDetail.trackingUrl}</a>
                          : <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#4A4040', margin: 0, fontStyle: 'italic' }}>Link de rastreio ainda não informado</p>}
                      </>
                    )}
                    {selectedDetail.shippingMethod === 'PICKUP' && (
                      <>
                        <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 12, fontWeight: 600, color: '#C8C0BC', margin: 0 }}>Retirada na loja</p>
                        <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#9A8D87', margin: 0 }}>Cliente optou por retirar pessoalmente. Nenhum frete aplicado.</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── HISTÓRICO DE STATUS ──────────────────────── */}
              <div style={{ marginTop: 20, borderTop: '0.5px solid #1E1E1E', paddingTop: 16 }}>
                <p className="adm-low-stock-title" style={{ margin: '0 0 10px' }}>Histórico de status</p>
                {!loadingDetail && selectedDetail && selectedDetail.statusUpdates.length === 0 && (
                  <p className="adm-table-sub" style={{ margin: 0 }}>Sem atualizações registradas.</p>
                )}
                {!loadingDetail && selectedDetail && selectedDetail.statusUpdates.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedDetail.statusUpdates.map((entry) => (
                      <div key={entry.id} style={{ border: '0.5px solid #1E1E1E', padding: '9px 11px', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: "var(--adm-font-ui)", fontSize: 12 }}>{STATUS_LABELS[entry.status] || entry.status}</span>
                        <span style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#9A8D87' }}>
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