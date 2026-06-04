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

interface CreateProductForm {
  name: string;
  description: string;
  category: string;
  costPrice: string;
  markup: string;
  size: string;
  color: string;
  barcode: string;
  stock: string;
}

const DEFAULT_TEST_PRODUCT_FORM = (barcode: string): CreateProductForm => ({
  name: barcode ? `Produto teste ${barcode}` : 'Produto teste',
  description: 'Produto de teste criado pelo leitor administrativo.',
  category: 'TESTE',
  costPrice: '10',
  markup: '2',
  size: 'U',
  color: 'Teste',
  barcode,
  stock: '1',
});

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
  const [createForm, setCreateForm] = useState<CreateProductForm>(DEFAULT_TEST_PRODUCT_FORM(''));
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');
  const [createError, setCreateError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function lookup(barcode: string) {
    const normalizedBarcode = barcode.trim();
    if (!normalizedBarcode) return;
    setLoading(true);
    setError('');
    setResult(null);
    setLocalStock({});
    setCreateMsg('');
    setCreateError('');
    setDeleteMsg('');
    setDeleteError('');
    setDeleteConfirmOpen(false);
    setCreateForm((prev) => ({
      ...DEFAULT_TEST_PRODUCT_FORM(normalizedBarcode),
      name: prev.barcode === normalizedBarcode && prev.name.trim() ? prev.name : `Produto teste ${normalizedBarcode}`,
    }));

    try {
      const { data } = await axios.get<ProductResult>(
        `${ADMIN_API}/admin/products/reference/${encodeURIComponent(normalizedBarcode)}`,
        { headers }
      );
      setResult(data);
      if (data.found && data.product) {
        const stock: Record<string, number> = {};
        data.product.variants.forEach((v) => { stock[v.id] = v.stock; });
        setLocalStock(stock);
        setHistory((prev) => [
          { barcode: normalizedBarcode, productName: data.product!.name, timestamp: new Date() },
          ...prev.filter((h) => h.barcode !== normalizedBarcode).slice(0, 9),
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

  function updateCreateForm<K extends keyof CreateProductForm>(field: K, value: CreateProductForm[K]) {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg('');
    setCreateError('');

    try {
      await axios.post(
        `${ADMIN_API}/products`,
        {
          name: createForm.name.trim(),
          description: createForm.description.trim(),
          category: createForm.category.trim(),
          costPrice: Number(createForm.costPrice),
          markup: Number(createForm.markup),
          size: createForm.size.trim(),
          color: createForm.color.trim(),
          barcode: createForm.barcode.trim(),
          stock: Number(createForm.stock),
        },
        { headers }
      );

      setCreateMsg('Produto criado com sucesso.');
      setQuery(createForm.barcode.trim());
      await lookup(createForm.barcode.trim());
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setCreateError(err.response?.data?.error || 'Não foi possível criar o produto.');
      } else {
        setCreateError('Não foi possível criar o produto.');
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteProduct() {
    const productId = result?.product?.id;
    if (!productId) return;

    setDeleting(true);
    setDeleteMsg('');
    setDeleteError('');

    try {
      await axios.delete(`${ADMIN_API}/admin/products/${productId}`, { headers });
      setDeleteMsg('Produto excluído com sucesso.');
      setResult(null);
      setLocalStock({});
      setDeleteConfirmOpen(false);
      setCreateForm(DEFAULT_TEST_PRODUCT_FORM(query.trim()));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setDeleteError(err.response?.data?.error || 'Não foi possível excluir o produto.');
      } else {
        setDeleteError('Não foi possível excluir o produto.');
      }
    } finally {
      setDeleting(false);
    }
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
      {createMsg && <p className="adm-message adm-message--success">{createMsg}</p>}
      {createError && <p className="adm-message adm-message--error">{createError}</p>}
      {deleteMsg && <p className="adm-message adm-message--success">{deleteMsg}</p>}
      {deleteError && <p className="adm-message adm-message--error">{deleteError}</p>}

      {/* Product result */}
      {result?.product && (
        <div className="adm-leitor-product">
          <div className="adm-leitor-product-hd">
            <div>
              <p className="adm-leitor-product-name">{result.product.name}</p>
              <p className="adm-leitor-product-meta">{result.product.category} · {result.product.variants.length} variante(s)</p>
            </div>

            <div className="adm-leitor-product-actions">
              {deleteConfirmOpen ? (
                <>
                  <button
                    type="button"
                    className="adm-btn adm-btn--danger"
                    onClick={() => void deleteProduct()}
                    disabled={deleting}
                  >
                    {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost"
                    onClick={() => setDeleteConfirmOpen(false)}
                    disabled={deleting}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="adm-btn adm-btn--danger"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  Excluir produto
                </button>
              )}
            </div>
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

      {!result?.product && query.trim() && error.includes('não encontrado') && (
        <div className="adm-leitor-create-card">
          <div className="adm-leitor-create-head">
            <div>
              <p className="adm-leitor-create-title">Criar produto de teste</p>
              <p className="adm-leitor-create-desc">Use o código lido para cadastrar um produto simples e depois excluí-lo pela própria tela.</p>
            </div>
          </div>

          <form className="adm-leitor-create-form" onSubmit={createProduct}>
            <div className="adm-leitor-create-grid adm-leitor-create-grid--double">
              <label className="adm-field">
                <span className="adm-label">Nome do produto</span>
                <input
                  type="text"
                  className="adm-input"
                  value={createForm.name}
                  onChange={(e) => updateCreateForm('name', e.target.value)}
                  required
                />
              </label>

              <label className="adm-field">
                <span className="adm-label">Categoria</span>
                <input
                  type="text"
                  className="adm-input"
                  value={createForm.category}
                  onChange={(e) => updateCreateForm('category', e.target.value)}
                  required
                />
              </label>
            </div>

            <label className="adm-field">
              <span className="adm-label">Descrição</span>
              <textarea
                className="adm-input adm-leitor-create-textarea"
                value={createForm.description}
                onChange={(e) => updateCreateForm('description', e.target.value)}
                rows={3}
              />
            </label>

            <div className="adm-leitor-create-grid adm-leitor-create-grid--triple">
              <label className="adm-field">
                <span className="adm-label">Cor</span>
                <input
                  type="text"
                  className="adm-input"
                  value={createForm.color}
                  onChange={(e) => updateCreateForm('color', e.target.value)}
                  required
                />
              </label>

              <label className="adm-field">
                <span className="adm-label">Tamanho</span>
                <input
                  type="text"
                  className="adm-input"
                  value={createForm.size}
                  onChange={(e) => updateCreateForm('size', e.target.value)}
                  required
                />
              </label>

              <label className="adm-field">
                <span className="adm-label">Estoque inicial</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="adm-input"
                  value={createForm.stock}
                  onChange={(e) => updateCreateForm('stock', e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="adm-leitor-create-grid adm-leitor-create-grid--triple">
              <label className="adm-field">
                <span className="adm-label">Código de barras</span>
                <input
                  type="text"
                  className="adm-input adm-leitor-create-barcode"
                  value={createForm.barcode}
                  onChange={(e) => updateCreateForm('barcode', e.target.value)}
                  required
                />
              </label>

              <label className="adm-field">
                <span className="adm-label">Custo</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="adm-input"
                  value={createForm.costPrice}
                  onChange={(e) => updateCreateForm('costPrice', e.target.value)}
                  required
                />
              </label>

              <label className="adm-field">
                <span className="adm-label">Markup</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="adm-input"
                  value={createForm.markup}
                  onChange={(e) => updateCreateForm('markup', e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="adm-leitor-create-actions">
              <button type="submit" className="adm-btn adm-btn--primary" disabled={creating}>
                {creating ? 'Criando...' : 'Criar produto'}
              </button>
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => setCreateForm(DEFAULT_TEST_PRODUCT_FORM(query.trim()))}
                disabled={creating}
              >
                Restaurar padrão
              </button>
            </div>
          </form>
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
