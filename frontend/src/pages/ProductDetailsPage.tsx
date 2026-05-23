import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { buildCartItem, colorToken, pickInitialVariant, toCurrency } from '../lib/catalog';
import type { CartItem, CatalogProduct, CatalogVariant } from '../types';

type ProductDetailsPageProps = {
  items: CatalogProduct[];
  loading: boolean;
  error: string | null;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
};

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

  useEffect(() => {
    if (!initialVariant || !product) return;
    setSelectedColor(initialVariant.color);
    setSelectedSize(initialVariant.size);
    setActiveImage(product.images[0] || product.imageUrl);
  }, [initialVariant, product]);

  useEffect(() => {
    setRecommendationPage(0);
  }, [product?.productId]);

  if (loading) {
    return <section className="page-status">Carregando produto...</section>;
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
  const resolvedColor = selectedColor || initialVariant.color;
  const resolvedSize = selectedSize || initialVariant.size;
  const variantsForColor = product.variants.filter((variant) => variant.color === resolvedColor);
  const selectedVariant =
    variantsForColor.find((variant) => variant.size === resolvedSize) ||
    pickInitialVariant(variantsForColor);

  const stockLabel =
    selectedVariant.stock <= 0
      ? 'Esgotado'
      : selectedVariant.stock <= 3
        ? 'Últimas peças'
        : 'Pronta entrega';
  const stockClass =
    selectedVariant.stock <= 0 ? 'off' : selectedVariant.stock <= 3 ? 'low' : 'ok';

  const cartItem = buildCartItem(product, selectedVariant);

  return (
    <>
      <section className="product-detail-page">
        <div className="breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <span>{product.category}</span>
          <span>/</span>
          <strong>{product.name}</strong>
        </div>

        <div className="product-detail-layout">
          <div className="detail-gallery">
            <div className="detail-main-image">
              <img src={activeImage || product.imageUrl} alt={product.name} />
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
              <strong className="price-tag">{toCurrency(product.price)}</strong>
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
          </div>
        </div>
      </section>

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
                <img src={item.imageUrl} alt={item.name} loading="lazy" />
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
