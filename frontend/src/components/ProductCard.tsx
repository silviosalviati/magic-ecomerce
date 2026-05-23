import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { buildCartItem, pickInitialVariant, toCurrency } from '../lib/catalog';
import type { CartItem, CatalogProduct } from '../types';

type ProductCardProps = {
  product: CatalogProduct;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
};

export function ProductCard({ product, onAddToCart, onBuyNow }: ProductCardProps) {
  const initialVariant = useMemo(() => pickInitialVariant(product.variants), [product.variants]);
  const selectedVariant = initialVariant;

  const cartItem: CartItem = buildCartItem(product, selectedVariant);

  return (
    <article className="product-card">
      <div className="product-media">
        <div className="product-badge-row" aria-hidden="true">
          <span className="product-badge">Restam {selectedVariant.stock}</span>
        </div>
        <Link
          className="product-media-link"
          to={`/produto/${product.productId}`}
          aria-label={`Ver produto ${product.name}`}
        >
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
        </Link>
      </div>
      <div className="product-content">
        <p className="product-meta">{product.category.toUpperCase()}</p>
        <h3 className="product-name">
          <Link className="product-name-link" to={`/produto/${product.productId}`}>
            {product.name}
          </Link>
        </h3>
        <strong className="price-tag">{toCurrency(product.price)}</strong>
        <p className="product-description">{product.description}</p>

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
            + Sacola
          </button>
        </div>
      </div>
    </article>
  );
}
