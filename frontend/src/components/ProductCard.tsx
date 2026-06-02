import { useMemo } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { buildCartItem, pickInitialVariant, toCurrency, toInstallmentLabel } from '../lib/catalog';
import type { CartItem, CatalogProduct } from '../types';

type ProductCardProps = {
  product: CatalogProduct;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
  style?: React.CSSProperties;
};

export function ProductCard({ product, onAddToCart, onBuyNow, style }: ProductCardProps) {
  const initialVariant = useMemo(() => pickInitialVariant(product.variants), [product.variants]);
  const selectedVariant = initialVariant;

  const cartItem: CartItem = buildCartItem(product, selectedVariant);

  return (
    <article className="product-card" style={style}>
      <div className="product-media">
        {selectedVariant.stock > 0 && selectedVariant.stock <= 5 && (
          <div className="product-badge-row" aria-hidden="true">
            <span className="product-badge">Restam {selectedVariant.stock}</span>
          </div>
        )}
        <Link
          className="product-media-link"
          to={`/produto/${product.productId}`}
          aria-label={`Ver produto ${product.name}`}
        >
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
          <span className="product-watermark" aria-hidden="true">
            <img src="/logo/logo-transparent.png" alt="" />
          </span>
        </Link>
        <span className="image-disclaimer" aria-hidden="true">
          Imagem meramente ilustrativa
        </span>
        <div className="product-hover-overlay" aria-hidden="true">
          <span className="product-hover-cta">Ver produto</span>
        </div>
      </div>
      <div className="product-content">
        <p className="product-meta">{product.category.toUpperCase()}</p>
        <h3 className="product-name">
          <Link className="product-name-link" to={`/produto/${product.productId}`}>
            {product.name}
          </Link>
        </h3>
        <strong className="price-tag">{toCurrency(product.price)}</strong>
        {toInstallmentLabel(product.price) && (
          <p className="price-installment">{toInstallmentLabel(product.price)}</p>
        )}

        <div className="product-footer-actions">
          <button
            type="button"
            className="primary-btn product-btn primary-cta"
            disabled={selectedVariant.stock <= 0}
            onClick={() => onBuyNow(cartItem)}
          >
            <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 3L4 14h6l-1 7 9-11h-6l1-7z" />
            </svg>
            Comprar agora
          </button>
          <button
            type="button"
            className="add-to-bag-btn"
            disabled={selectedVariant.stock <= 0}
            onClick={() => onAddToCart(cartItem)}
          >
            Adicionar à sacola
          </button>
        </div>
      </div>
    </article>
  );
}
