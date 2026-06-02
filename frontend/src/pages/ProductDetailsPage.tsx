import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { buildCartItem, colorToken, pickInitialVariant, toCurrency, toInstallmentLabel } from '../lib/catalog';
import { SEO } from '../components/SEO';
import type { CartItem, CatalogProduct, CatalogVariant } from '../types';

type ProductDetailsPageProps = {
  items: CatalogProduct[];
  loading: boolean;
  error: string | null;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
};

function resolveBreadcrumbCategory(category: string): string {
  const normalized = category.toLowerCase();
  if (normalized.includes('femin')) return 'Feminino';
  if (normalized.includes('mascul')) return 'Masculino';
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
}

export function ProductDetailsPage({
  items,
  loading,
  error,
  onAddToCart,
  onBuyNow,
}: ProductDetailsPageProps) {
  const { productId } = useParams();

  const product = useMemo(
    () => items.find((entry) => entry.productId === productId),
    [items, productId]
  );

  const recommendations = useMemo(() => {
    if (!product) return [];
    return items
      .filter(
        (entry) => entry.productId !== product.productId && entry.category === product.category
      );
  }, [items, product]);

  const [recommendationPage, setRecommendationPage] = useState(0);

  const recommendationPages = Math.max(1, Math.ceil(recommendations.length / 3));
  const pagedRecommendations = useMemo(
    () => recommendations.slice(recommendationPage * 3, recommendationPage * 3 + 3),
    [recommendationPage, recommendations]
  );

  const initialVariant = useMemo<CatalogVariant | null>(
    () => (product ? pickInitialVariant(product.variants) : null),
    [product]
  );

  const [selectedColor, setSelectedColor] = useState(initialVariant?.color ?? '');
  const [selectedSize, setSelectedSize] = useState(initialVariant?.size ?? '');
  const [activeImage, setActiveImage] = useState(product?.images[0] ?? '');
  const [zoomedOpen, setZoomedOpen] = useState(false);

  useEffect(() => {
    if (!initialVariant || !product) return;
    setSelectedColor(initialVariant.color);
    setSelectedSize(initialVariant.size);
    setActiveImage(product.images[0] || product.imageUrl);
  }, [initialVariant, product]);

  useEffect(() => {
    setRecommendationPage(0);
    setZoomedOpen(false);
  }, [product?.productId]);

  // Escape key closes lightbox
  useEffect(() => {
    if (!zoomedOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setZoomedOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [zoomedOpen]);

  if (loading) {
    return (
      <section className="product-detail-page">
        <div className="breadcrumbs">
          <span className="skeleton-line" style={{ width: 240, height: 13, display: 'block' }} />
        </div>
        <div className="product-detail-layout">
          <div className="detail-gallery">
            <div className="detail-main-image">
              <div className="skeleton-pulse" style={{ width: '100%', aspectRatio: '3/4', display: 'block' }} />
            </div>
            <div className="detail-thumbs">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-pulse" style={{ height: 92, display: 'block' }} />
              ))}
            </div>
          </div>
          <div className="detail-copy">
            <span className="skeleton-line" style={{ width: '38%', height: 11, display: 'block' }} />
            <span className="skeleton-line" style={{ width: '72%', height: 42, display: 'block', marginTop: 8 }} />
            <span className="skeleton-line" style={{ width: '30%', height: 22, display: 'block', marginTop: 4 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton-pulse" style={{ width: 44, height: 44, borderRadius: '50%', display: 'block', flexShrink: 0 }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-pulse" style={{ width: 44, height: 44, borderRadius: 2, display: 'block', flexShrink: 0 }} />
              ))}
            </div>
            <div className="cta-row" style={{ marginTop: 16 }}>
              <div className="skeleton-pulse" style={{ height: 44, borderRadius: 2, display: 'block' }} />
              <div className="skeleton-pulse" style={{ height: 44, borderRadius: 2, display: 'block' }} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return <section className="page-status error">{error}</section>;
  }

  if (!product || !initialVariant) {
    return (
      <section className="page-status">
        <strong>Produto não encontrado.</strong>
        <Link className="primary-btn" to="/">
          Voltar para a vitrine
        </Link>
      </section>
    );
  }

  const colors = Array.from(new Set(product.variants.map((variant) => variant.color)));
  const hasResolvedColor = product.variants.some((variant) => variant.color === selectedColor);
  const resolvedColor = hasResolvedColor ? selectedColor : initialVariant.color;
  const hasResolvedSize = product.variants.some(
    (variant) => variant.color === resolvedColor && variant.size === selectedSize
  );
  const resolvedSize = hasResolvedSize ? selectedSize : initialVariant.size;
  const variantsForColor = product.variants.filter((variant) => variant.color === resolvedColor);
  const selectedVariant =
    variantsForColor.find((variant) => variant.size === resolvedSize) ||
    pickInitialVariant(variantsForColor) ||
    initialVariant;

  const stockLabel =
    selectedVariant.stock <= 0
      ? 'Esgotado'
      : selectedVariant.stock <= 3
        ? 'Últimas peças'
        : 'Pronta entrega';
  const stockClass =
    selectedVariant.stock <= 0 ? 'off' : selectedVariant.stock <= 3 ? 'low' : 'ok';

  const cartItem = buildCartItem(product, selectedVariant);
  const breadcrumbCategory = resolveBreadcrumbCategory(product.category);
  const installment = toInstallmentLabel(product.price);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.length > 0 ? product.images : [product.imageUrl],
    brand: { '@type': 'Brand', name: 'MAGI.C' },
    sku: selectedVariant.barcode,
    offers: {
      '@type': 'Offer',
      url: `https://www.vistamagic.com.br/produto/${product.productId}`,
      priceCurrency: 'BRL',
      price: product.price.toFixed(2),
      availability:
        selectedVariant.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Vista Magic' },
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.vistamagic.com.br/' },
      { '@type': 'ListItem', position: 2, name: breadcrumbCategory },
      { '@type': 'ListItem', position: 3, name: product.name },
    ],
  };

  return (
    <>
      <SEO
        title={product.name}
        description={`${product.name} | Compre online na Vista Magic — ${(product.description ?? '').slice(0, 120)}. Entrega rápida para todo o Brasil, troca grátis em 7 dias.`}
        canonical={`/produto/${product.productId}`}
        ogImage={product.images[0] || product.imageUrl}
        ogType="product"
        jsonLd={[productJsonLd, breadcrumbJsonLd]}
      />
      <section className="product-detail-page">
        <div className="breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <span>{breadcrumbCategory}</span>
          <span>/</span>
          <strong>{product.name}</strong>
        </div>

        <div className="product-detail-layout">
          <div className="detail-gallery">
            <div className="detail-main-image">
              <button
                type="button"
                className="detail-zoom-btn"
                onClick={() => setZoomedOpen(true)}
                aria-label="Ampliar imagem do produto"
              >
                <img src={activeImage || product.imageUrl} alt={product.name} />
                <span className="product-watermark product-watermark--detail" aria-hidden="true">
                  <img src="/logo/logo-transparent.png" alt="" />
                </span>
                <span className="image-disclaimer image-disclaimer--detail" aria-hidden="true">
                  Imagem meramente ilustrativa
                </span>
                <span className="detail-zoom-hint" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </span>
              </button>
            </div>
            <div className="detail-thumbs">
              {product.images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={image === activeImage ? 'thumb-btn active' : 'thumb-btn'}
                  onClick={() => setActiveImage(image)}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="detail-copy">
            <p className="detail-category">{product.category}</p>
            <h1>{product.name}</h1>
            <p className="detail-description">{product.description}</p>

            <div className="detail-meta">
              <div>
                <strong className="price-tag">{toCurrency(product.price)}</strong>
                {installment && <p className="price-installment detail-installment">{installment}</p>}
              </div>
              <span className={`stock ${stockClass}`}>{stockLabel}</span>
            </div>

            <div className="selector-group detail-selector">
              <div className="selector-head">
                <span>Cor</span>
                <strong>{resolvedColor}</strong>
              </div>
              <div className="color-palette">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={color === resolvedColor ? 'color-swatch active' : 'color-swatch'}
                    style={{ backgroundColor: colorToken(color) }}
                    onClick={() => {
                      const nextVariants = product.variants.filter((variant) => variant.color === color);
                      setSelectedColor(color);
                      setSelectedSize(pickInitialVariant(nextVariants).size);
                    }}
                    aria-label={`Selecionar cor ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="selector-group detail-selector">
              <div className="selector-head">
                <span>Tamanho</span>
                <strong>{selectedVariant.size}</strong>
              </div>
              <div className="size-palette">
                {variantsForColor.map((variant) => (
                  <button
                    key={variant.variantId}
                    type="button"
                    className={variant.size === selectedVariant.size ? 'size-chip active' : 'size-chip'}
                    onClick={() => setSelectedSize(variant.size)}
                    disabled={variant.stock <= 0}
                  >
                    {variant.size}
                  </button>
                ))}
              </div>
            </div>

            <div className="detail-highlights">
              <div>
                <span>Curadoria</span>
                <strong>Seleção premium MAGI.C</strong>
              </div>
              <div>
                <span>Envio</span>
                <strong>Despacho rápido após confirmação</strong>
              </div>
              <div>
                <span>Código</span>
                <strong>{selectedVariant.barcode}</strong>
              </div>
            </div>

            <div className="cta-row detail-cta-row">
              <button
                type="button"
                className="ghost-btn product-btn"
                disabled={selectedVariant.stock <= 0}
                onClick={() => onAddToCart(cartItem)}
              >
                Adicionar ao carrinho
              </button>
              <button
                type="button"
                className="primary-btn product-btn"
                disabled={selectedVariant.stock <= 0}
                onClick={() => onBuyNow(cartItem)}
              >
                Comprar agora
              </button>
            </div>

            <div className="detail-trust-badges">
              <div className="detail-trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Pagamento 100% seguro</span>
              </div>
              <div className="detail-trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                <span>Troca grátis em até 7 dias</span>
              </div>
              <div className="detail-trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="1" y="3" width="15" height="13" rx="1" />
                  <path d="M16 8h4l3 5v3h-7V8z" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <span>Envio rápido após confirmação do pagamento</span>
              </div>
              <div className="detail-trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Atendimento pelo WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {zoomedOpen && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Imagem ampliada"
          onClick={() => setZoomedOpen(false)}
        >
          <button
            type="button"
            className="lightbox-close"
            aria-label="Fechar imagem ampliada"
            onClick={() => setZoomedOpen(false)}
          >
            <X size={20} strokeWidth={1.6} aria-hidden="true" />
          </button>
          <img
            className="lightbox-img"
            src={activeImage || product.imageUrl}
            alt={product.name}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="product-watermark product-watermark--lightbox" aria-hidden="true">
            <img src="/logo/logo-transparent.png" alt="" />
          </span>
          <span className="image-disclaimer image-disclaimer--lightbox" aria-hidden="true">
            Imagem meramente ilustrativa
          </span>
        </div>
      )}

      {recommendations.length > 0 && (
        <section className="recommendations">
          <div className="section-head recommendation-head">
            <div>
              <h2>Você também pode gostar</h2>
              <p>Mais peças da categoria {product.category}</p>
            </div>
            {recommendations.length > 3 && (
              <div className="recommendation-nav" aria-label="Navegação de recomendações">
                <button
                  type="button"
                  className="recommendation-nav-btn"
                  onClick={() =>
                    setRecommendationPage(
                      (current) => (current - 1 + recommendationPages) % recommendationPages
                    )
                  }
                  aria-label="Voltar 3 produtos"
                >
                  ‹
                </button>
                <span className="recommendation-nav-index">
                  {recommendationPage + 1}/{recommendationPages}
                </span>
                <button
                  type="button"
                  className="recommendation-nav-btn"
                  onClick={() =>
                    setRecommendationPage((current) => (current + 1) % recommendationPages)
                  }
                  aria-label="Avançar 3 produtos"
                >
                  ›
                </button>
              </div>
            )}
          </div>
          <div className="recommendation-grid">
            {pagedRecommendations.map((item) => (
              <Link key={item.productId} className="recommendation-card" to={`/produto/${item.productId}`}>
                <div className="recommendation-media">
                  <img src={item.imageUrl} alt={item.name} loading="lazy" />
                  <span className="image-disclaimer image-disclaimer--recommendation" aria-hidden="true">
                    Imagem meramente ilustrativa
                  </span>
                </div>
                <div>
                  <p>{item.category}</p>
                  <h3>{item.name}</h3>
                  <strong>{toCurrency(item.price)}</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
