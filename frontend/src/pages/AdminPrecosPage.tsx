import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { ADMIN_API, useAdmin } from '../contexts/AdminContext';
import { formatCurrencyBRL } from '../lib/numberFormat';

interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number | string;
  markup: number | string;
  basePrice: number | string;
  createdAt: string;
}

interface PriceHistoryEntry {
  id: string;
  oldCostPrice: number | string;
  oldMarkup: number | string;
  oldBasePrice: number | string;
  newCostPrice: number | string;
  newMarkup: number | string;
  newBasePrice: number | string;
  changedBy: string;
  reason: string | null;
  changedAt: string;
}

function n(v: number | string) {
  return Number(v);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMarkup(v: number | string) {
  return `${Number(v).toFixed(2)}×`;
}

interface EditState {
  costPrice: string;
  markup: string;
  basePrice: string;
  useOverride: boolean;
  reason: string;
}

export function AdminPrecosPage() {
  const { headers } = useAdmin();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMarkup, setBulkMarkup] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulking, setBulking] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [bulkError, setBulkError] = useState('');

  const [historyProductId, setHistoryProductId] = useState<string | null>(null);
  const [historyProductName, setHistoryProductName] = useState('');
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);

  async function fetchProducts() {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get<{ products: Product[] }>(
        `${ADMIN_API}/admin/products`,
        { headers }
      );
      const list = data.products ?? [];
      setProducts(list);
      const cats = Array.from(new Set(list.map((p) => p.category))).sort();
      setCategories(cats);
    } catch {
      setError('Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchProducts(); }, []);

  const filtered = products.filter((p) => {
    const term = search.toLowerCase();
    const matchSearch = !term || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
    const matchCat = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  function startEdit(p: Product) {
    setEditId(p.id);
    setEditState({
      costPrice: String(n(p.costPrice)),
      markup: String(n(p.markup)),
      basePrice: String(n(p.basePrice)),
      useOverride: false,
      reason: '',
    });
    setSaveMsg('');
    setSaveError('');
  }

  function cancelEdit() {
    setEditId(null);
    setEditState(null);
  }

  function computedBasePrice(): number {
    if (!editState) return 0;
    if (editState.useOverride) return Number(editState.basePrice) || 0;
    return Number((Number(editState.costPrice) * Number(editState.markup)).toFixed(2));
  }

  function computedMarkup(): number {
    if (!editState) return 0;
    if (editState.useOverride) {
      const bp = Number(editState.basePrice);
      const cp = Number(editState.costPrice);
      return cp > 0 ? Number((bp / cp).toFixed(2)) : 0;
    }
    return Number(editState.markup) || 0;
  }

  async function saveEdit(productId: string) {
    if (!editState) return;
    setSaving(true);
    setSaveMsg('');
    setSaveError('');
    try {
      const body: Record<string, unknown> = {
        costPrice: Number(editState.costPrice),
        reason: editState.reason || undefined,
      };
      if (editState.useOverride) {
        body.basePrice = Number(editState.basePrice);
      } else {
        body.markup = Number(editState.markup);
      }
      await axios.patch(`${ADMIN_API}/admin/products/${productId}/price`, body, { headers });
      setSaveMsg('Preço atualizado.');
      setEditId(null);
      setEditState(null);
      await fetchProducts();
    } catch (err: any) {
      setSaveError(err?.response?.data?.error ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  }

  async function applyBulk() {
    if (!bulkMarkup) return;
    const markupNum = Number(bulkMarkup);
    if (!Number.isFinite(markupNum) || markupNum <= 0) {
      setBulkError('Markup inválido.');
      return;
    }
    setBulking(true);
    setBulkMsg('');
    setBulkError('');
    try {
      const { data } = await axios.post(
        `${ADMIN_API}/admin/products/bulk-price`,
        {
          filter: { productIds: Array.from(selected) },
          change: { markup: markupNum, reason: bulkReason || undefined },
        },
        { headers }
      );
      setBulkMsg(`${data.updated} produto(s) atualizado(s).`);
      setSelected(new Set());
      setBulkMarkup('');
      setBulkReason('');
      await fetchProducts();
    } catch (err: any) {
      setBulkError(err?.response?.data?.error ?? 'Erro ao aplicar.');
    } finally {
      setBulking(false);
    }
  }

  async function openHistory(p: Product) {
    setHistoryProductId(p.id);
    setHistoryProductName(p.name);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const { data } = await axios.get<{ history: PriceHistoryEntry[] }>(
        `${ADMIN_API}/admin/products/${p.id}/price-history`,
        { headers }
      );
      setHistory(data.history ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }

  function closeHistory() {
    setHistoryProductId(null);
    setHistory([]);
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0;

  return (
    <AdminLayout title="Preços">
      <div className="adm-section">
        {/* Filtros */}
        <div className="adm-filters-row">
          <input
            className="adm-input"
            placeholder="Buscar por nome ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <select
            className="adm-input"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Painel de ação em lote */}
        {someSelected && (
          <div className="adm-bulk-bar">
            <span className="adm-bulk-label">{selected.size} produto(s) selecionado(s)</span>
            <input
              className="adm-input adm-input--sm"
              placeholder="Novo markup (ex: 2.5)"
              value={bulkMarkup}
              onChange={(e) => setBulkMarkup(e.target.value)}
              style={{ width: 150 }}
            />
            <input
              className="adm-input adm-input--sm"
              placeholder="Motivo (opcional)"
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              style={{ width: 200 }}
            />
            <button
              className="adm-btn adm-btn--primary adm-btn--sm"
              onClick={applyBulk}
              disabled={bulking || !bulkMarkup}
            >
              {bulking ? 'Aplicando...' : 'Aplicar Markup'}
            </button>
            {bulkMsg && <span className="adm-msg-ok">{bulkMsg}</span>}
            {bulkError && <span className="adm-msg-err">{bulkError}</span>}
          </div>
        )}

        {saveMsg && <p className="adm-msg-ok" style={{ marginBottom: 8 }}>{saveMsg}</p>}
        {error && <p className="adm-msg-err">{error}</p>}

        {loading ? (
          <p className="adm-loading">Carregando...</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Custo</th>
                  <th>Markup</th>
                  <th>Preço de Venda</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#888', padding: '24px 0' }}>
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                )}
                {filtered.map((p) =>
                  editId === p.id && editState ? (
                    <tr key={p.id} className="adm-row-editing">
                      <td>
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                      </td>
                      <td colSpan={2}>
                        <strong>{p.name}</strong>
                        <span style={{ marginLeft: 8, color: '#888', fontSize: 12 }}>{p.category}</span>
                      </td>
                      <td>
                        <input
                          className="adm-input adm-input--sm"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editState.costPrice}
                          onChange={(e) => setEditState({ ...editState, costPrice: e.target.value })}
                          style={{ width: 90 }}
                          placeholder="Custo R$"
                        />
                      </td>
                      <td>
                        {!editState.useOverride ? (
                          <input
                            className="adm-input adm-input--sm"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={editState.markup}
                            onChange={(e) => setEditState({ ...editState, markup: e.target.value })}
                            style={{ width: 80 }}
                            placeholder="Markup"
                          />
                        ) : (
                          <span style={{ color: '#888', fontSize: 13 }}>{computedMarkup().toFixed(2)}×</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {editState.useOverride ? (
                            <input
                              className="adm-input adm-input--sm"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editState.basePrice}
                              onChange={(e) => setEditState({ ...editState, basePrice: e.target.value })}
                              style={{ width: 100 }}
                              placeholder="Preço R$"
                            />
                          ) : (
                            <span style={{ fontWeight: 600 }}>{formatCurrencyBRL(computedBasePrice())}</span>
                          )}
                          <label style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={editState.useOverride}
                              onChange={(e) => setEditState({ ...editState, useOverride: e.target.checked })}
                            />
                            Definir preço manualmente
                          </label>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <input
                            className="adm-input adm-input--sm"
                            placeholder="Motivo (opcional)"
                            value={editState.reason}
                            onChange={(e) => setEditState({ ...editState, reason: e.target.value })}
                            style={{ width: 160 }}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="adm-btn adm-btn--primary adm-btn--sm"
                              onClick={() => saveEdit(p.id)}
                              disabled={saving}
                            >
                              {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button className="adm-btn adm-btn--sm" onClick={cancelEdit} disabled={saving}>
                              Cancelar
                            </button>
                          </div>
                          {saveError && <span className="adm-msg-err" style={{ fontSize: 12 }}>{saveError}</span>}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id}>
                      <td>
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                      </td>
                      <td>{p.name}</td>
                      <td><span className="adm-badge">{p.category}</span></td>
                      <td>{formatCurrencyBRL(p.costPrice)}</td>
                      <td>{formatMarkup(p.markup)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrencyBRL(p.basePrice)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="adm-btn adm-btn--sm"
                            onClick={() => startEdit(p)}
                            title="Editar preço"
                          >
                            Editar
                          </button>
                          <button
                            className="adm-btn adm-btn--sm"
                            onClick={() => openHistory(p)}
                            title="Ver histórico"
                          >
                            Histórico
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer de histórico */}
      {historyProductId && (
        <>
          <div className="adm-drawer-overlay" onClick={closeHistory} />
          <div className="adm-drawer" ref={drawerRef}>
            <div className="adm-drawer-header">
              <div>
                <div className="adm-drawer-title">Histórico de Preços</div>
                <div className="adm-drawer-subtitle">{historyProductName}</div>
              </div>
              <button className="adm-drawer-close" onClick={closeHistory}>✕</button>
            </div>
            <div className="adm-drawer-body">
              {historyLoading && <p className="adm-loading">Carregando histórico...</p>}
              {!historyLoading && history.length === 0 && (
                <p style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>
                  Nenhuma alteração registrada ainda.
                </p>
              )}
              {!historyLoading && history.map((h) => (
                <div key={h.id} className="adm-history-entry">
                  <div className="adm-history-date">{formatDate(h.changedAt)}</div>
                  <div className="adm-history-row">
                    <span className="adm-history-old">
                      {formatCurrencyBRL(h.oldBasePrice)} ({formatMarkup(h.oldMarkup)})
                    </span>
                    <span className="adm-history-arrow">→</span>
                    <span className="adm-history-new">
                      {formatCurrencyBRL(h.newBasePrice)} ({formatMarkup(h.newMarkup)})
                    </span>
                  </div>
                  {h.reason && <div className="adm-history-reason">"{h.reason}"</div>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}