import { useEffect, useState, useMemo } from 'react';
import type React from 'react';
import { Shirt, Venus, Waves } from 'lucide-react';
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

  // Hero usa os 5 primeiros (mais novos, conforme ordem da API)
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

  function goToPreviousHeroItem() {
    setHeroIndex((current) => (current - 1 + heroItems.length) % heroItems.length);
  }
  function goToNextHeroItem() {
    setHeroIndex((current) => (current + 1) % heroItems.length);
  }

  const features = [
    {
      title: 'Moda Masculina',
      description: 'Modelagens modernas, caimento impecável e peças versáteis para elevar o visual diário.',
      icon: <Shirt size={18} strokeWidth={1.5} />,
      ctaHref: masculineItems.length > 0 ? '/#masculino' : null,
      ctaLabel: 'Ver masculino',
    },
    {
      title: 'Moda Feminina',
      description: 'Looks elegantes e atuais para compor combinações marcantes em qualquer ocasião.',
      icon: <Venus size={18} strokeWidth={1.5} />,
      ctaHref: feminineItems.length > 0 ? '/#feminino' : null,
      ctaLabel: 'Ver feminino',
    },
    {
      title: 'Tricot',
      description: 'Texturas sofisticadas, conforto premium, acabamento de alto padrão e durabilidade. Aqui, cada peça entrega qualidade real e respeito ao consumidor.',
      icon: <Waves size={18} strokeWidth={1.5} />,
      ctaHref: null,
      ctaLabel: null,
    },
  ];

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero" id="marca">
        <div className="hero-left">
          <div className="hero-showcase">
            {spotlightItem?.imageUrl ? (
              <Link
                className="hero-product-placeholder"
                to={`/produto/${spotlightItem.productId}`}
                aria-label={`Ver produto ${spotlightItem.name}`}
              >
                <img className="hero-product-img" src={spotlightItem.imageUrl} alt={spotlightItem.name} />
                <div className="hero-product-overlay" aria-hidden="true" />
                <p className="product-name-small">{spotlightItem.name}</p>
                <p className="product-price-small">{toCurrency(spotlightItem.price)}</p>
              </Link>
            ) : (
              <div className="hero-product-placeholder">
                <div className="placeholder-shape" aria-hidden="true">
                  <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="#C4A882" strokeWidth="0.8">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <p className="product-name-small">Vista Magic</p>
                <p className="product-price-small">Carregando...</p>
              </div>
            )}

            {heroItems.length > 1 && (
              <div className="hero-controls" aria-label="Vitrine de produtos">
                <button type="button" className="hero-control-btn" onClick={goToPreviousHeroItem}>
                  ‹
                </button>
                <div className="hero-dots">
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
                <button type="button" className="hero-control-btn" onClick={goToNextHeroItem}>
                  ›
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="hero-right">
          <p className="hero-eyebrow">Nova coleção disponível</p>
          <h1 className="hero-headline">
            Moda que você<br />
            <strong>vai querer usar</strong>
            <br />todo dia.
          </h1>
          <p className="hero-sub">
            Peças com caimento impecável, selecionadas com cuidado. Entrega rápida, troca fácil e compra 100% segura.
          </p>
          <div className="hero-ctas">
            <a className="btn-primary" href="#novidades">Explorar coleção</a>
            <a className="btn-ghost" href="#novidades">Ver categorias</a>
          </div>
        </div>
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
          <span>Troca em 30 Dias</span>
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

      {/* ── FEATURES ── */}
      <div className="features" aria-label="Destaques da experiência">
        {features.map((feature) => (
          <div className="feat" key={feature.title}>
            <div className="feat-icon">{feature.icon}</div>
            <p className="feat-title">{feature.title}</p>
            <p className="feat-desc">{feature.description}</p>
            <div className="feat-actions">
              {feature.ctaHref ? (
                <a className="feat-link" href={feature.ctaHref}>{feature.ctaLabel}</a>
              ) : (
                <span className="feat-link-placeholder" aria-hidden="true" />
              )}
            </div>
          </div>
        ))}
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
                <div className="product-media skeleton-card" style={{ height: 'clamp(280px, 40vw, 480px)' }} />
                <div className="product-content" style={{ gap: 8 }}>
                  <span className="skeleton-line" style={{ width: '38%', height: 10 }} />
                  <span className="skeleton-line" style={{ width: '72%', height: 16, marginTop: 4 }} />
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