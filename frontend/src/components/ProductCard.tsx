import { useEffect, useMemo, useState } from 'react';
import { buildCartItem, colorToken, pickInitialVariant, toCurrency } from '../lib/catalog';
import type { CartItem, CatalogProduct } from '../types';

type ProductCardProps = {
  product: CatalogProduct;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
};

export function ProductCard({ product, onAddToCart, onBuyNow }: ProductCardProps) {
  const initialVariant = useMemo(() => pickInitialVariant(product.variants), [product.variants]);
  const [selectedColor, setSelectedColor] = useState(initialVariant.color);
  const [selectedSize, setSelectedSize] = useState(initialVariant.size);

  const colors = useMemo(
    () => Array.from(new Set(product.variants.map((variant) => variant.color))),
    [product.variants]
  );

  const variantsForColor = useMemo(
    () => product.variants.filter((variant) => variant.color === selectedColor),
    [product.variants, selectedColor]
  );

  useEffect(() => {
    if (!variantsForColor.some((variant) => variant.size === selectedSize)) {
      setSelectedSize(pickInitialVariant(variantsForColor).size);
    }
  }, [selectedSize, variantsForColor]);

  const selectedVariant =
    variantsForColor.find((variant) => variant.size === selectedSize) || variantsForColor[0];

  const cartItem: CartItem = buildCartItem(product, selectedVariant);

  return (
    <article className="product-card">
      <div className="product-media">
        <div className="product-badge-row" aria-hidden="true">
          <span className="product-badge">Restam {selectedVariant.stock}</span>
        </div>
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
      </div>
      <div className="product-content">
        <p className="product-meta">
          {product.category} • Ref {selectedVariant.barcode}
        </p>
        <h3 className="product-name">{product.name}</h3>
        <strong className="price-tag">{toCurrency(product.price)}</strong>
        <p className="product-description">{product.description}</p>

        <div className="selectors-grid">
          <div className="selector-group">
            <div className="selector-head">
              <span>Cor</span>
              <strong>{selectedColor}</strong>
            </div>
            <div className="color-select-row">
              <div className="color-palette">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={color === selectedColor ? 'color-swatch active' : 'color-swatch'}
                  style={{ backgroundColor: colorToken(color) }}
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Selecionar cor ${color}`}
                />
              ))}
              </div>
              <span className="selected-color-label">{selectedColor}</span>
            </div>
          </div>

          <div className="selector-group">
            <div className="selector-head">
              <span>Tamanho</span>
              <strong>{selectedSize}</strong>
            </div>
            <div className="size-palette">
              {variantsForColor.map((variant) => (
                <button
                  key={variant.variantId}
                  type="button"
                  className={variant.size === selectedSize ? 'size-chip active' : 'size-chip'}
                  onClick={() => setSelectedSize(variant.size)}
                  disabled={variant.stock <= 0}
                >
                  {variant.size}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="cta-row">
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
            className="ghost-btn product-btn"
            disabled={selectedVariant.stock <= 0}
            onClick={() => onAddToCart(cartItem)}
          >
            <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 8H7" />
              <circle cx="10" cy="19" r="1.6" />
              <circle cx="17" cy="19" r="1.6" />
            </svg>
            Carrinho
          </button>
        </div>
      </div>
    </article>
  );
}
