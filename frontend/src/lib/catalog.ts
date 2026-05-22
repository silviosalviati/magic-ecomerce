import type { CartItem, CatalogProduct, CatalogVariant } from '../types';

export function toCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function colorToken(color: string): string {
  const normalized = color.trim().toLowerCase();
  const palette: Record<string, string> = {
    preto: '#1f2127',
    branco: '#f6f1f2',
    bege: '#ceb7a1',
    azul: '#5972b8',
    cinza: '#9095a1',
    rosa: '#efb6c7',
    vermelho: '#b44e67',
    verde: '#648c6c',
    marrom: '#7e6050',
  };

  return palette[normalized] || '#d5bac2';
}

export function pickInitialVariant(variants: CatalogVariant[]): CatalogVariant {
  return variants.find((variant) => variant.stock > 0) || variants[0];
}

export function buildCartItem(product: CatalogProduct, variant: CatalogVariant): CartItem {
  return {
    cartKey: `${product.productId}-${variant.variantId}`,
    productId: product.productId,
    variantId: variant.variantId,
    name: product.name,
    imageUrl: product.imageUrl,
    price: product.price,
    color: variant.color,
    size: variant.size,
    barcode: variant.barcode,
    stock: variant.stock,
    quantity: 1,
  };
}
