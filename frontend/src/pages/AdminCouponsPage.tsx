import axios from 'axios';
import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { ADMIN_API, useAdmin } from '../contexts/AdminContext';
import { formatCurrencyBRL, formatPercentBR } from '../lib/numberFormat';

interface Coupon {
  id: string;
  code: string;
  type: string;
  discount: number | string;
  expiresAt: string;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDiscount(type: string, discount: number | string) {
  return type === 'PERCENTAGE'
    ? formatPercentBR(discount, { maximumFractionDigits: 2 })
    : formatCurrencyBRL(discount);
}

const EMPTY_FORM = { code: '', type: 'PERCENTAGE', discount: '', expiresAt: '', maxUses: '' };

export function AdminCouponsPage() {
  const { headers } = useAdmin();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [createError, setCreateError] = useState('');

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function fetchCoupons() {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get<{ coupons: Coupon[] }>(`${ADMIN_API}/admin/coupons`, { headers });
      setCoupons(data.coupons);
    } catch {
      setError('Erro ao carregar cupons.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchCoupons(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg('');
    setCreateError('');
    try {
      await axios.post(
        `${ADMIN_API}/admin/coupons`,
        {
          code: form.code.toUpperCase().trim(),
          type: form.type,
          discount: Number(form.discount),
          expiresAt: new Date(form.expiresAt).toISOString(),
          maxUses: form.maxUses ? Number(form.maxUses) : null,
        },
        { headers }
      );
      setCreateMsg('Cupom criado com sucesso.');
      setForm(EMPTY_FORM);
      void fetchCoupons();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setCreateError(err.response?.data?.error || 'Erro ao criar cupom.');
      } else {
        setCreateError('Erro ao criar cupom.');
      }
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(coupon: Coupon) {
    setTogglingId(coupon.id);
    try {
      await axios.patch(`${ADMIN_API}/admin/coupons/${coupon.id}`, { active: !coupon.active }, { headers });
      setCoupons((prev) => prev.map((c) => c.id === coupon.id ? { ...c, active: !coupon.active } : c));
    } catch {
      // ignore
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await axios.delete(`${ADMIN_API}/admin/coupons/${id}`, { headers });
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      setConfirmDeleteId(null);
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  const isExpired = (c: Coupon) => new Date(c.expiresAt) < new Date();

  return (
    <AdminLayout title="Cupons">
      {/* Create form */}
      <div className="adm-coupons-create">
        <p className="adm-low-stock-title" style={{ marginBottom: 16 }}>Novo cupom</p>
        <form onSubmit={handleCreate} className="adm-coupons-form">
          <div className="adm-field">
            <label className="adm-label">Código</label>
            <input
              type="text"
              className="adm-input"
              placeholder="EX: VERAO20"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              required
            />
          </div>

          <div className="adm-coupons-row">
            <div className="adm-field" style={{ flex: 1 }}>
              <label className="adm-label">Tipo</label>
              <select
                className="adm-select"
                style={{ width: '100%', padding: '11px 14px' }}
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="PERCENTAGE">Percentual (%)</option>
                <option value="FIXED">Valor fixo (R$)</option>
              </select>
            </div>

            <div className="adm-field" style={{ flex: 1 }}>
              <label className="adm-label">{form.type === 'PERCENTAGE' ? 'Desconto (%)' : 'Desconto (R$)'}</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={form.type === 'PERCENTAGE' ? '100' : undefined}
                className="adm-input"
                placeholder={form.type === 'PERCENTAGE' ? '10' : '20.00'}
                value={form.discount}
                onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="adm-coupons-row">
            <div className="adm-field" style={{ flex: 1 }}>
              <label className="adm-label">Válido até</label>
              <input
                type="date"
                className="adm-input"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                required
              />
            </div>

            <div className="adm-field" style={{ flex: 1 }}>
              <label className="adm-label">Máximo de usos <span style={{ color: '#3D3330', fontStyle: 'normal' }}>(opcional)</span></label>
              <input
                type="number"
                min="1"
                step="1"
                className="adm-input"
                placeholder="Ilimitado"
                value={form.maxUses}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
              />
            </div>
          </div>

          {createMsg && <p className="adm-message adm-message--success">{createMsg}</p>}
          {createError && <p className="adm-message adm-message--error">{createError}</p>}

          <button type="submit" className="adm-btn adm-btn--primary" disabled={creating}>
            {creating
              ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 13, height: 13 }} />
              : 'Criar cupom'}
          </button>
        </form>
      </div>

      {/* List */}
      <p className="adm-low-stock-title" style={{ marginTop: 36, marginBottom: 14 }}>Cupons cadastrados</p>

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
                <th>Código</th>
                <th>Desconto</th>
                <th>Validade</th>
                <th>Usos</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13, color: '#F0E8E4', letterSpacing: '0.06em' }}>
                    {c.code}
                  </td>
                  <td>{formatDiscount(c.type, c.discount)}</td>
                  <td style={{ color: isExpired(c) ? '#EF8BA0' : '#9A8D87' }}>
                    {formatDate(c.expiresAt)}
                    {isExpired(c) && <span style={{ fontFamily: 'Arial,sans-serif', fontSize: 9, marginLeft: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>expirado</span>}
                  </td>
                  <td>
                    {c.usedCount}
                    {c.maxUses !== null && <span style={{ color: '#3D3330' }}> / {c.maxUses}</span>}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`adm-badge ${c.active && !isExpired(c) ? 'adm-badge--verified' : 'adm-badge--unverified'}`}
                      style={{ cursor: 'pointer', background: 'none' }}
                      disabled={togglingId === c.id}
                      onClick={() => void toggleActive(c)}
                    >
                      {togglingId === c.id ? '…' : c.active && !isExpired(c) ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="adm-table-actions">
                    {confirmDeleteId === c.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="adm-btn adm-btn--danger"
                          style={{ padding: '5px 12px', fontSize: 10 }}
                          disabled={deletingId === c.id}
                          onClick={() => void handleDelete(c.id)}
                        >
                          {deletingId === c.id ? '…' : 'Confirmar'}
                        </button>
                        <button
                          type="button"
                          className="adm-table-btn"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="adm-table-btn"
                        onClick={() => setConfirmDeleteId(c.id)}
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {coupons.length === 0 && (
            <div className="adm-empty" style={{ padding: '48px 20px' }}>
              <p className="adm-empty-title">Nenhum cupom cadastrado</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
