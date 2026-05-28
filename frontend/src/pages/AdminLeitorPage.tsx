import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { ADMIN_API, useAdmin } from '../contexts/AdminContext';

interface Variant {
  id: string;
  barcode: string | null;
  color: string;
  size: string;
  stock: number;
}

interface ProductResult {
  found: boolean;
  product?: {
    id: string;
    name: string;
    category: string;
    variants: Variant[];
  };
}

interface ScanRecord {
  barcode: string;
  productName: string;
  timestamp: Date;
}

export function AdminLeitorPage() {
  const { headers } = useAdmin();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductResult | null>(null);
  const [error, setError] = useState('');
  const [localStock, setLocalStock] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function lookup(barcode: string) {
    if (!barcode.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setLocalStock({});

    try {
      const { data } = await axios.get<ProductResult>(
        `${ADMIN_API}/admin/products/reference/${encodeURIComponent(barcode.trim())}`,
        { headers }
      );
      setResult(data);
      if (data.found && data.product) {
        const stock: Record<string, number> = {};
        data.product.variants.forEach((v) => { stock[v.id] = v.stock; });
        setLocalStock(stock);
        setHistory((prev) => [
          { barcode: barcode.trim(), productName: data.product!.name, timestamp: new Date() },
          ...prev.filter((h) => h.barcode !== barcode.trim()).slice(0, 9),
        ]);
      } else {
        setError('Produto não encontrado para esse código.');
      }
    } catch {
      setError('Erro ao buscar produto.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void lookup(query);
  }

  async function saveStock(variantId: string) {
    const stock = localStock[variantId];
    if (stock === undefined) return;
    setSavingId(variantId);
    try {
      await axios.patch(
        `${ADMIN_API}/admin/variants/${variantId}/stock`,
        { stock },
        { headers }
      );
      setSavedId(variantId);
      setTimeout(() => setSavedId(null), 2000);
      setResult((prev) =>
        prev?.product
          ? {
              ...prev,
              product: {
                ...prev.product,
                variants: prev.product.variants.map((v) =>
                  v.id === variantId ? { ...v, stock } : v
                ),
              },
            }
          : prev
      );
    } catch {
      // ignore — keep editing
    } finally {
      setSavingId(null);
    }
  }

  function changeStock(variantId: string, delta: number) {
    setLocalStock((prev) => ({
      ...prev,
      [variantId]: Math.max(0, (prev[variantId] ?? 0) + delta),
    }));
  }

  function setStockDirect(variantId: string, val: string) {
    const n = parseInt(val, 10);
    if (!isNaN(n)) setLocalStock((prev) => ({ ...prev, [variantId]: Math.max(0, n) }));
  }

  function formatTime(d: Date) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <AdminLayout title="Leitor">
      {/* Input */}
      <form onSubmit={handleSubmit}>
        <div className="adm-leitor-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="adm-leitor-input"
            placeholder="Código de barras…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="adm-btn adm-btn--primary" style={{ marginBottom: 24 }} disabled={loading || !query.trim()}>
          {loading
            ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 14, height: 14 }} />
            : 'Buscar'}
        </button>
      </form>

      {error && <p className="adm-message adm-message--error">{error}</p>}

      {/* Product result */}
      {result?.product && (
        <div className="adm-leitor-product">
          <div className="adm-leitor-product-hd">
            <p className="adm-leitor-product-name">{result.product.name}</p>
            <p className="adm-leitor-product-meta">{result.product.category} · {result.product.variants.length} variante(s)</p>
          </div>

          <div className="adm-leitor-variants">
            {result.product.variants.map((variant) => {
              const currentStock = localStock[variant.id] ?? variant.stock;
              const changed = currentStock !== variant.stock;
              return (
                <div key={variant.id} className="adm-leitor-variant">
                  <div className="adm-leitor-variant-info">
                    <p className="adm-leitor-variant-name">{variant.color} · {variant.size}</p>
                    {variant.barcode && (
                      <p className="adm-leitor-variant-barcode">{variant.barcode}</p>
                    )}
                  </div>

                  <div className="adm-stock-ctrl">
                    <button
                      type="button"
                      className="adm-stock-btn"
                      onClick={() => changeStock(variant.id, -1)}
                      disabled={currentStock <= 0}
                    >−</button>
                    <input
                      type="number"
                      min={0}
                      value={currentStock}
                      onChange={(e) => setStockDirect(variant.id, e.target.value)}
                      className="adm-stock-val"
                      style={{ width: 48, background: 'none', border: '0.5px solid #1E1E1E', textAlign: 'center', fontFamily: 'Georgia,serif', fontSize: 18, color: currentStock === 0 ? '#EF8BA0' : '#F0E8E4', padding: '2px 0', outline: 'none' }}
                    />
                    <button
                      type="button"
                      className="adm-stock-btn"
                      onClick={() => changeStock(variant.id, 1)}
                    >+</button>
                  </div>

                  <button
                    type="button"
                    className={`adm-btn ${changed ? 'adm-btn--primary' : 'adm-btn--ghost'}`}
                    style={{ padding: '8px 16px', fontSize: 10 }}
                    onClick={() => void saveStock(variant.id)}
                    disabled={savingId === variant.id || !changed}
                  >
                    {savingId === variant.id
                      ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 12, height: 12 }} />
                      : savedId === variant.id
                        ? '✓ Salvo'
                        : 'Salvar'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="adm-leitor-history">
          <p className="adm-leitor-history-title">Leituras recentes</p>
          <div className="adm-leitor-history-list">
            {history.map((h, i) => (
              <button
                key={i}
                type="button"
                className="adm-leitor-history-item"
                onClick={() => { setQuery(h.barcode); void lookup(h.barcode); }}
              >
                <span className="adm-leitor-history-barcode">{h.barcode}</span>
                <span className="adm-leitor-history-name">{h.productName}</span>
                <span style={{ fontFamily: 'Arial,sans-serif', fontSize: 10, color: '#3D3330', flexShrink: 0 }}>{formatTime(h.timestamp)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!result && !error && history.length === 0 && (
        <div className="adm-empty" style={{ paddingTop: 80 }}>
          <svg className="adm-empty-icon" width="48" height="48" viewBox="0 0 28 22" fill="none" stroke="currentColor" strokeWidth="0">
            <rect x="1"   y="1" width="3"   height="20" rx="0.5" fill="currentColor" opacity="0.2"/>
            <rect x="6"   y="1" width="1.5" height="20" rx="0.5" fill="currentColor" opacity="0.15"/>
            <rect x="9"   y="1" width="3"   height="20" rx="0.5" fill="currentColor" opacity="0.2"/>
            <rect x="14"  y="1" width="1.5" height="20" rx="0.5" fill="currentColor" opacity="0.15"/>
            <rect x="17.5" y="1" width="2.5" height="20" rx="0.5" fill="currentColor" opacity="0.2"/>
            <rect x="22"  y="1" width="1.5" height="20" rx="0.5" fill="currentColor" opacity="0.15"/>
            <rect x="25"  y="1" width="2"   height="20" rx="0.5" fill="currentColor" opacity="0.2"/>
          </svg>
          <p className="adm-empty-title">Aguardando leitura</p>
          <p className="adm-empty-desc">Digite ou escaneie um código de barras para consultar o estoque.</p>
        </div>
      )}
    </AdminLayout>
  );
}
