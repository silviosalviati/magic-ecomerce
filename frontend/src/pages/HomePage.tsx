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
          <p className="hero-eyebrow">Seu estilo, sua magia</p>
          <h1 className="hero-headline">
            Roupas com<br />
            <strong>linguagem de marca,</strong>
            <br />não vitrine genérica.
          </h1>
          <p className="hero-sub">
            Peças selecionadas para uma experiência de compra mais limpa e visualmente
            precisa — como nas melhores lojas de moda digital.
          </p>
          <div className="hero-ctas">
            <a className="btn-primary" href="#novidades">Explorar coleção</a>
            <a className="btn-ghost" href="#novidades">Ver categorias</a>
          </div>
        </div>
      </section>

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

        {loading && <div className="status">Carregando produtos...</div>}
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