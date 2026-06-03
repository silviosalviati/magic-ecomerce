import axios from 'axios';
import { useRef, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { ADMIN_API, useAdmin } from '../contexts/AdminContext';

interface ProductResult {
  found: boolean;
  product?: {
    id: string;
    name: string;
    category: string;
    images: string[];
    variants: Array<{ id: string; barcode: string | null; color: string; size: string }>;
  };
}

interface UploadSlot {
  file: File | null;
  preview: string | null;
  label: string;
  side: 'front' | 'back';
}

function normalizeBarcodeKey(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9\-_]/g, '_');
}

function extractVariantBarcodeFromImageUrl(imageUrl: string): string | null {
  const sanitizePath = (value: string): string => decodeURIComponent(value).replace(/^\/+/, '').trim();

  const fromObjectPath = (value: string): string | null => {
    const objectPath = sanitizePath(value);
    if (!objectPath.startsWith('produtos/')) return null;

    const segments = objectPath.split('/').filter(Boolean);
    if (segments.length < 3) return null;

    return segments[1] || null;
  };

  if (!imageUrl) return null;

  if (imageUrl.startsWith('produtos/')) {
    return fromObjectPath(imageUrl);
  }

  try {
    const parsed = new URL(imageUrl);

    if (parsed.pathname === '/products/images/object') {
      const objectPath = String(parsed.searchParams.get('path') || '');
      return fromObjectPath(objectPath);
    }

    const pathname = decodeURIComponent(parsed.pathname || '');
    const marker = '/produtos/';
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex >= 0) {
      return fromObjectPath(pathname.slice(markerIndex + 1));
    }
  } catch {
    return null;
  }

  return null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function withCacheBuster(url: string, nonce: number): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('v', String(nonce));
    return parsed.toString();
  } catch {
    const divider = url.includes('?') ? '&' : '?';
    return `${url}${divider}v=${nonce}`;
  }
}

function toAdminThumbUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.pathname === '/products/images/object') {
      parsed.searchParams.set('w', '240');
      parsed.searchParams.set('q', '62');
      parsed.searchParams.set('fm', 'webp');
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

export function AdminFotoPage() {
  const { headers } = useAdmin();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<ProductResult | null>(null);
  const [searchError, setSearchError] = useState('');

  const [slots, setSlots] = useState<[UploadSlot, UploadSlot]>([
    { file: null, preview: null, label: 'Frente', side: 'front' },
    { file: null, preview: null, label: 'Costas', side: 'back' },
  ]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selectedBarcode, setSelectedBarcode] = useState('');
  const [imageNonce, setImageNonce] = useState(() => Date.now());

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const selectedVariant = result?.product?.variants.find(
    (variant) => (variant.barcode || '') === selectedBarcode
  );

  const variantImageGroups = (() => {
    if (!result?.product) return [] as Array<{
      id: string;
      color: string;
      size: string;
      barcode: string | null;
      images: string[];
    }>;

    const imagesByBarcode = new Map<string, string[]>();
    const fallbackImages: string[] = [];

    for (const imageUrl of result.product.images) {
      const imageBarcode = extractVariantBarcodeFromImageUrl(imageUrl);
      if (!imageBarcode) {
        fallbackImages.push(imageUrl);
        continue;
      }

      const key = normalizeBarcodeKey(imageBarcode);
      const current = imagesByBarcode.get(key) || [];
      current.push(imageUrl);
      imagesByBarcode.set(key, current);
    }

    const groups = result.product.variants.map((variant) => {
      const key = normalizeBarcodeKey(String(variant.barcode || ''));
      return {
        ...variant,
        images: key ? (imagesByBarcode.get(key) || []) : [],
      };
    });

    if (fallbackImages.length > 0) {
      groups.push({
        id: '__fallback__',
        color: 'Sem variante',
        size: '-',
        barcode: null,
        images: fallbackImages,
      });
    }

    return groups;
  })();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError('');
    setResult(null);
    setUploadMsg('');
    setUploadError('');
    try {
      const { data } = await axios.get<ProductResult>(
        `${ADMIN_API}/admin/products/reference/${encodeURIComponent(query.trim())}`,
        { headers }
      );
      setResult(data);
      setImageNonce(Date.now());
      const defaultBarcode = data.product?.variants.find((variant) => Boolean(variant.barcode))?.barcode || '';
      setSelectedBarcode(defaultBarcode);
      if (!data.found) setSearchError('Produto não encontrado para essa referência.');
    } catch {
      setSearchError('Erro ao buscar produto. Verifique a referência.');
    } finally {
      setSearching(false);
    }
  }

  function handleFileChange(index: 0 | 1, file: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSlots((prev) => {
      const next = [...prev] as [UploadSlot, UploadSlot];
      next[index] = { ...next[index], file, preview: url };
      return next;
    });
    setUploadMsg('');
    setUploadError('');
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!result?.product || !slots[0].file || !slots[1].file || !selectedBarcode.trim()) return;
    setUploading(true);
    setUploadMsg('');
    setUploadError('');

    try {
      const [frontBase64, backBase64] = await Promise.all([
        fileToBase64(slots[0].file),
        fileToBase64(slots[1].file),
      ]);

      const { data } = await axios.post(
        `${ADMIN_API}/admin/products/reference/${encodeURIComponent(query.trim())}/photos`,
        {
          frontBase64,
          backBase64,
          contentTypeFront: slots[0].file.type || 'image/jpeg',
          contentTypeBack: slots[1].file.type || 'image/jpeg',
          targetBarcode: selectedBarcode.trim(),
        },
        { headers }
      );

      setUploadMsg('Fotos enviadas com sucesso!');
      const refreshNonce = Date.now();
      setImageNonce(refreshNonce);
      setResult((prev) =>
        prev?.product
          ? {
              ...prev,
              product: {
                ...prev.product,
                images: (data.product?.images || prev.product.images).map((url: string) => withCacheBuster(url, refreshNonce)),
              },
            }
          : prev
      );
      setSlots([
        { file: null, preview: null, label: 'Frente', side: 'front' },
        { file: null, preview: null, label: 'Costas', side: 'back' },
      ]);
      if (frontRef.current) frontRef.current.value = '';
      if (backRef.current) backRef.current.value = '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError = error.response?.data as { error?: string; message?: string } | undefined;
        const message = apiError?.error || apiError?.message;
        setUploadError(typeof message === 'string' && message.trim().length > 0
          ? message
          : 'Falha ao enviar fotos. Tente novamente.');
      } else if (error instanceof Error && error.message.trim().length > 0) {
        setUploadError(error.message);
      } else {
        setUploadError('Falha ao enviar fotos. Tente novamente.');
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminLayout title="Foto">
      {/* Search */}
      <form className="adm-foto-search" onSubmit={handleSearch}>
        <input
          type="text"
          className="adm-foto-search-input"
          placeholder="Código de barras ou nome do produto…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button type="submit" className="adm-btn adm-btn--primary" disabled={searching || !query.trim()}>
          {searching ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 14, height: 14 }} /> : 'Buscar'}
        </button>
      </form>

      {searchError && <p className="adm-message adm-message--error">{searchError}</p>}

      {/* Product found */}
      {result?.product && (
        <>
          <div className="adm-foto-product">
            <p className="adm-foto-product-name">{result.product.name}</p>
            <p className="adm-foto-product-meta">{result.product.category} · {result.product.variants.length} variante(s)</p>

            <div className="adm-foto-variant-panel">
              <div className="adm-foto-variant-head">
                <p className="adm-foto-section-label">Variante para vincular fotos</p>
                <p className="adm-foto-variant-help">
                  As fotos enviadas serão exibidas na vitrine quando a cor desta variante for selecionada.
                </p>
              </div>

              <div className="adm-foto-variant-control">
                <label htmlFor="adm-foto-variant-select" className="adm-foto-variant-select-label">
                  Cor / Tamanho / Código de barras
                </label>
                <select
                  id="adm-foto-variant-select"
                  className="adm-foto-variant-select"
                  value={selectedBarcode}
                  onChange={(e) => setSelectedBarcode(e.target.value)}
                >
                  <option value="">Selecione uma variante</option>
                  {result.product.variants.map((variant) => (
                    <option
                      key={variant.id}
                      value={variant.barcode || ''}
                      disabled={!variant.barcode}
                    >
                      {variant.color} / {variant.size} {variant.barcode ? `· ${variant.barcode}` : '· sem código de barras'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedVariant && (
                <div className="adm-foto-variant-selected">
                  <span>{selectedVariant.color}</span>
                  <span>{selectedVariant.size}</span>
                  <span>{selectedVariant.barcode}</span>
                </div>
              )}
            </div>

            {result.product.images.length > 0 && (
              <div>
                <p className="adm-foto-section-label" style={{ marginTop: 18 }}>
                  Fotos atuais
                </p>
                <div className="adm-foto-current-groups">
                  {variantImageGroups.map((group) => (
                    <article key={group.id} className="adm-foto-current-group">
                      <div className="adm-foto-current-group-head">
                        <strong>{group.color} / {group.size}</strong>
                        <span>{group.barcode || 'sem código de barras'}</span>
                      </div>

                      {group.images.length > 0 ? (
                        <div className="adm-foto-current">
                          {group.images.map((url, i) => (
                            <img
                              key={`${group.id}-${i}-${imageNonce}`}
                              src={toAdminThumbUrl(withCacheBuster(url, imageNonce))}
                              alt={`Foto ${i + 1}`}
                              className="adm-foto-thumb"
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="adm-foto-current-empty">Sem fotos vinculadas para esta variante.</p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upload form */}
          <form onSubmit={handleUpload}>
            <p className="adm-foto-section-label" style={{ marginBottom: 12 }}>
              Enviar novas fotos
            </p>

            <div className="adm-foto-upload-grid">
              {([0, 1] as const).map((i) => {
                const slot = slots[i];
                const inputRef = i === 0 ? frontRef : backRef;
                return (
                  <div key={i} className="adm-foto-dropzone">
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="adm-foto-file-input"
                      onChange={(e) => handleFileChange(i, e.target.files?.[0] ?? null)}
                    />
                    {slot.preview ? (
                      <img src={slot.preview} alt={slot.label} className="adm-foto-preview" />
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2A2A2A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    )}
                    <p className="adm-foto-dropzone-label">{slot.label}</p>
                    <p className="adm-foto-dropzone-hint">
                      {slot.file ? slot.file.name : 'Clique para selecionar'}
                    </p>
                  </div>
                );
              })}
            </div>

            {uploadMsg && <p className="adm-message adm-message--success">{uploadMsg}</p>}
            {uploadError && <p className="adm-message adm-message--error">{uploadError}</p>}

            <button
              type="submit"
              className="adm-btn adm-btn--primary"
              disabled={uploading || !slots[0].file || !slots[1].file || !selectedBarcode.trim()}
            >
              {uploading
                ? <><span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 14, height: 14 }} /> Enviando…</>
                : 'Salvar fotos'}
            </button>
          </form>
        </>
      )}

      {!result && !searchError && (
        <div className="adm-empty" style={{ paddingTop: 80 }}>
          <svg className="adm-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <p className="adm-empty-title">Busque um produto</p>
          <p className="adm-empty-desc">Informe o código de barras ou nome para gerenciar as fotos.</p>
        </div>
      )}
    </AdminLayout>
  );
}
