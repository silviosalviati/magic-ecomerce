import { useEffect, useState, useMemo } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { toCurrency } from '../lib/catalog';
import type { CartItem, CatalogProduct } from '../types';

type HomePageProps = {
  items: CatalogProduct[];
  searchQuery: string;
  loading: boolean;
  error: string | null;
  warning: string | null;
  onRetry: () => void;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
};

const MARQUEE_ITEMS = [
  'Moda Feminina', '·', 'Moda Masculina', '·', 'Tricot Premium', '·',
  'Nova Coleção', '·', 'Entrega Rápida', '·', 'Compra Segura', '·',
  'Moda Feminina', '·', 'Moda Masculina', '·', 'Tricot Premium', '·',
  'Nova Coleção', '·', 'Entrega Rápida', '·', 'Compra Segura', '·',
];

export function HomePage({
  items,
  searchQuery,
  loading,
  error,
  warning,
  onRetry,
  onAddToCart,
  onBuyNow,
}: HomePageProps) {
  const feminineItems = useMemo(
    () => items.filter((item) => item.category.toLowerCase().includes('femin')),
    [items]
  );
  const masculineItems = useMemo(
    () => items.filter((item) => item.category.toLowerCase().includes('mascul')),
    [items]
  );

  const heroItems = useMemo(() => items.slice(0, 5), [items]);
  const [heroIndex, setHeroIndex] = useState(0);
  const spotlightItem = heroItems[heroIndex];

  useEffect(() => {
    if (heroIndex >= heroItems.length) setHeroIndex(0);
  }, [heroIndex, heroItems.length]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const timerId = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroItems.length);
    }, 3200);
    return () => window.clearInterval(timerId);
  }, [heroItems.length]);

  return (
    <>
      {/* ── HERO — Full-Bleed ── */}
      <section className="hero" id="marca">
        <div className="hero-bg">
          {heroItems.length > 0 ? (
            heroItems.map((item, index) => (
              <img
                key={item.productId}
                className={index === heroIndex ? 'hero-bg-img active' : 'hero-bg-img'}
                src={item.imageUrl}
                alt=""
                aria-hidden="true"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            ))
          ) : (
            <div className="hero-bg-img active" style={{ background: 'var(--color-bg-deep)' }} />
          )}
          <div className="hero-bg-gradient" />
        </div>

        <div className="hero-content">
          <div className="hero-text">
            <p className="hero-eyebrow">Nova coleção — {new Date().getFullYear()}</p>
            <h1 className="hero-headline">
              Moda que<br />
              <em>encanta.</em>
            </h1>
          </div>

          {spotlightItem && (
            <div className="hero-product-info">
              <Link
                className="hero-feat-link"
                to={`/produto/${spotlightItem.productId}`}
                aria-label={`Ver ${spotlightItem.name}`}
              >
                <span className="hero-feat-name">{spotlightItem.name}</span>
                <span className="hero-feat-price">{toCurrency(spotlightItem.price)}</span>
              </Link>
              <a className="btn-primary" href="#novidades">Ver coleção</a>
            </div>
          )}
        </div>

        {heroItems.length > 1 && (
          <div className="hero-nav" aria-label="Vitrine de produtos">
            {heroItems.map((item, index) => (
              <button
                key={item.productId}
                type="button"
                className={index === heroIndex ? 'hero-dot active' : 'hero-dot'}
                onClick={() => setHeroIndex(index)}
                aria-label={`Mostrar ${item.name}`}
              />
            ))}
          </div>
        )}

        {heroItems.length > 1 && (
          <div className="hero-progress-bar" aria-hidden="true">
            <div key={heroIndex} className="hero-progress-fill" />
          </div>
        )}
      </section>

      {/* ── TRUST BAR ── */}
      <div className="trust-bar" aria-label="Garantias da loja">
        <div className="trust-item">
          <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Compra Segura</span>
        </div>
        <div className="trust-item">
          <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          <span>Troca em 7 Dias</span>
        </div>
        <div className="trust-item">
          <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <path d="M16 8h4l3 5v3h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <span>Envio Rápido</span>
        </div>
        <div className="trust-item">
          <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Atendimento via WhatsApp</span>
        </div>
      </div>

      {/* ── MARQUEE STRIP ── */}
      <div className="marquee-strip" aria-hidden="true">
        <div className="marquee-track">
          {MARQUEE_ITEMS.map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      </div>

      {/* ── NOVIDADES — catálogo completo ── */}
      <section className="catalog" id="novidades">
        <div className="section-head">
          <p className="section-label-inline">Novidades da coleção</p>
        </div>

        {loading && (
          <div className="product-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="product-card skeleton-card">
                <div className="product-media skeleton-card" style={{ height: 'clamp(340px, 52vw, 580px)' }} />
                <div className="product-content" style={{ gap: 8 }}>
                  <span className="skeleton-line" style={{ width: '38%', height: 10 }} />
                  <span className="skeleton-line" style={{ width: '72%', height: 18, marginTop: 4 }} />
                  <span className="skeleton-line" style={{ width: '28%', height: 15, marginTop: 4 }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {warning && <div className="status warning">{warning}</div>}
        {error && (
          <div className="status status-row">
            <span>{error}</span>
            <button type="button" className="status-action" onClick={onRetry}>
              Tentar novamente
            </button>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="status">
            {searchQuery.trim().length > 0
              ? `Nenhum produto encontrado para "${searchQuery.trim()}".`
              : 'Sem produtos cadastrados no momento.'}
          </div>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="product-grid">
            {items.map((item, index) => (
              <ProductCard
                key={item.productId}
                product={item}
                onAddToCart={onAddToCart}
                onBuyNow={onBuyNow}
                style={{ '--i': index } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── MODA FEMININA ── */}
      {!loading && !error && feminineItems.length > 0 && (
        <section className="category-section" id="feminino">
          <div className="category-title-row">
            <p className="category-subtitle">Categoria</p>
            <h2 className="category-title">Moda Feminina</h2>
            <span className="category-title-bg" aria-hidden="true">Feminina</span>
          </div>
          <div className="product-grid">
            {feminineItems.map((item, index) => (
              <ProductCard
                key={item.productId}
                product={item}
                onAddToCart={onAddToCart}
                onBuyNow={onBuyNow}
                style={{ '--i': index } as React.CSSProperties}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── MODA MASCULINA ── */}
      {!loading && !error && masculineItems.length > 0 && (
        <section className="category-section" id="masculino">
          <div className="category-title-row">
            <p className="category-subtitle">Categoria</p>
            <h2 className="category-title">Moda Masculina</h2>
            <span className="category-title-bg" aria-hidden="true">Masculina</span>
          </div>
          <div className="product-grid">
            {masculineItems.map((item, index) => (
              <ProductCard
                key={item.productId}
                product={item}
                onAddToCart={onAddToCart}
                onBuyNow={onBuyNow}
                style={{ '--i': index } as React.CSSProperties}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
