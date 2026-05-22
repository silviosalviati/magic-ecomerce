import { useMemo } from 'react';
import { LogoMark } from '../components/LogoMark';
import { ProductCard } from '../components/ProductCard';
import type { CartItem, CatalogProduct } from '../types';

type HomePageProps = {
  items: CatalogProduct[];
  loading: boolean;
  error: string | null;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
};

export function HomePage({ items, loading, error, onAddToCart, onBuyNow }: HomePageProps) {
  const featuredItems = useMemo(() => items.slice(0, 8), [items]);

  return (
    <>
      <section className="hero" id="marca">
        <div className="hero-copy">
          <LogoMark />
          <p className="eyebrow">Seu Estilo, Sua Mágia</p>
          <h1>Roupas com linguagem de marca, não vitrine genérica.</h1>
          <p>
            Peças selecionadas para uma experiência de compra mais limpa, rápida e
            visualmente precisa, como nas melhores lojas de moda digital.
          </p>
          <div className="hero-actions">
            <a className="primary-btn" href="#novidades">
              Ver novidades
            </a>
            <a className="ghost-btn hero-link-btn" href="#novidades">
              Explorar lançamentos
            </a>
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-copy">
            <p>Destaques da experiência</p>
            <h2>UX de moda mais objetiva.</h2>
            <span>Imagem forte, leitura rápida e compra sem atrito.</span>
          </div>
          <div className="hero-metrics">
            <article>
              <strong>Curadoria</strong>
              <span>Seleção enxuta e premium por categoria</span>
            </article>
            <article>
              <strong>Compra</strong>
              <span>Cor, tamanho e sacola no mesmo fluxo</span>
            </article>
            <article>
              <strong>Mobile</strong>
              <span>Leitura mais compacta e foco no produto</span>
            </article>
          </div>
        </div>
      </section>

      <section className="catalog novelties-section" id="novidades">
        <div className="section-head">
          <h2>Novidades</h2>
          <p>{items.length} itens na coleção, com os lançamentos em destaque</p>
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
