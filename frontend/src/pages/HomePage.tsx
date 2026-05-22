import { useMemo } from 'react';
import { ProductCard } from '../components/ProductCard';
import { toCurrency } from '../lib/catalog';
import type { CartItem, CatalogProduct } from '../types';

type HomePageProps = {
  items: CatalogProduct[];
  loading: boolean;
  error: string | null;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
};

export function HomePage({ items, loading, error, onAddToCart, onBuyNow }: HomePageProps) {
  const featuredItems = useMemo(() => items.slice(0, 3), [items]);
  const spotlightItem = featuredItems[0];

  const features = [
    {
      title: 'Curadoria',
      description: 'Seleção enxuta e premium por categoria, sem ruído visual.',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3l1.7 4.7L18 9.4l-4.3 1.7L12 16l-1.7-4.9L6 9.4l4.3-1.7L12 3z" />
        </svg>
      ),
    },
    {
      title: 'Compra fluida',
      description: 'Cor, tamanho e sacola no mesmo fluxo. Sem redirecionamentos.',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 7h10l-1 9H8L7 7z" />
          <path d="M9 7a3 3 0 0 1 6 0" />
        </svg>
      ),
    },
    {
      title: 'Mobile first',
      description: 'Leitura compacta e foco total no produto em qualquer tela.',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="7" y="3" width="10" height="18" rx="2" />
          <path d="M10 18h4" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <section className="hero" id="marca">
        <div className="hero-left">
          <div className="hero-product-placeholder">
            <span className="product-badge">ÚLTIMAS UNIDADES</span>
            <div className="placeholder-shape" aria-hidden="true">
              <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="#C4A882" strokeWidth="0.8">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <p className="product-name-small">{spotlightItem?.name ?? 'Blusa Ellie'}</p>
            <p className="product-price-small">{spotlightItem ? toCurrency(spotlightItem.price) : 'R$ 99,80'}</p>
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
            precisa - como nas melhores lojas de moda digital.
          </p>
          <div className="hero-ctas">
            <a className="btn-primary" href="#novidades">
              Explorar coleção
            </a>
            <a className="btn-ghost" href="#novidades">
              Ver categorias
            </a>
          </div>
        </div>
      </section>

      <div className="features" aria-label="Destaques da experiência">
        {features.map((feature) => (
          <div className="feat" key={feature.title}>
            <div className="feat-icon">{feature.icon}</div>
            <p className="feat-title">{feature.title}</p>
            <p className="feat-desc">{feature.description}</p>
          </div>
        ))}
      </div>

      <section className="catalog novelties-section" id="novidades">
        <div className="section-head">
          <p className="section-label-inline">Novidades da coleção</p>
        </div>

        {loading && <div className="status">Carregando produtos...</div>}
        {error && <div className="status error">{error}</div>}

        {!loading && !error && featuredItems.length === 0 && (
          <div className="status">Sem produtos cadastrados no momento.</div>
        )}

        {!loading &&
          !error &&
          featuredItems.length > 0 && (
            <div className="product-grid novelties-grid">
              {featuredItems.map((item) => (
                <ProductCard
                  key={item.productId}
                  product={item}
                  onAddToCart={onAddToCart}
                  onBuyNow={onBuyNow}
                />
              ))}
            </div>
          )}
      </section>
    </>
  );
}
