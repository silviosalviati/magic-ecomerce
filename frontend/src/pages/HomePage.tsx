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
  const itemsByCategory = useMemo(() => {
    return items.reduce<Record<string, CatalogProduct[]>>((acc, item) => {
      const category = (item.category || 'Sem categoria').trim();
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});
  }, [items]);

  const categoryNames = useMemo(
    () => Object.keys(itemsByCategory).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [itemsByCategory]
  );

  return (
    <>
      <section className="hero" id="novidades">
        <div className="hero-copy">
          <LogoMark />
          <p className="eyebrow">Nova curadoria</p>
          <h1>Roupas com linguagem de marca, não vitrine genérica.</h1>
          <p>
            Peças selecionadas para uma experiência de compra mais limpa, rápida e
            visualmente precisa, como nas melhores lojas de moda digital.
          </p>
          <div className="hero-actions">
            <a className="primary-btn" href="#colecao">
              Explorar coleção
            </a>
            <a className="ghost-btn hero-link-btn" href="#colecao">
              Ver categorias
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

      <section className="catalog" id="colecao">
        <div className="section-head">
          <h2>Coleção por categoria</h2>
          <p>{items.length} produtos unificados em vitrine</p>
        </div>

        {!loading && !error && categoryNames.length > 0 && (
          <div className="catalog-filters" aria-label="Filtros de categorias">
            <div className="mobile-filters-head">Categorias</div>
            <div className="category-pills" aria-label="Categorias">
              {categoryNames.map((category) => (
                <a key={category} href={`#categoria-${encodeURIComponent(category)}`}>
                  {category}
                </a>
              ))}
            </div>
          </div>
        )}

        {loading && <div className="status">Carregando produtos...</div>}
        {error && <div className="status error">{error}</div>}

        {!loading && !error && categoryNames.length === 0 && (
          <div className="status">Sem produtos cadastrados no momento.</div>
        )}

        {!loading &&
          !error &&
          categoryNames.map((category) => (
            <section
              key={category}
              id={`categoria-${encodeURIComponent(category)}`}
              className="category-section"
            >
              <div className="category-title-row">
                <h3>{category}</h3>
                <span>{itemsByCategory[category].length} produtos</span>
              </div>
              <div className="product-grid">
                {itemsByCategory[category].map((item) => (
                  <ProductCard
                    key={item.productId}
                    product={item}
                    onAddToCart={onAddToCart}
                    onBuyNow={onBuyNow}
                  />
                ))}
              </div>
            </section>
          ))}
      </section>
    </>
  );
}
