import type { CartItem, CatalogProduct, CatalogVariant } from '../types';
import { formatCurrencyBRL } from './numberFormat';

export function toCurrency(value: number): string {
  return formatCurrencyBRL(value);
}

function normalizeColorKey(color: string): string {
  return color
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function colorToken(color: string): string {
  const normalized = normalizeColorKey(color);
  const palette: Record<string, string> = {
    preto: '#1f2127',
    preta: '#1f2127',
    black: '#1f2127',
    branco: '#f6f1f2',
    branca: '#f6f1f2',
    white: '#f6f1f2',
    gelo: '#f1efea',
    cru: '#efe9de',
    offwhite: '#f6f1f2',
    marfim: '#eee5d2',
    ivory: '#eee5d2',
    nude: '#d5b9a3',
    rosaclaro: '#efc9d4',
    bege: '#ceb7a1',
    areia: '#c9b49a',
    caqui: '#a99272',
    azul: '#5972b8',
    azulmarinho: '#2d3a5c',
    marinho: '#2d3a5c',
    jeans: '#3f5f8f',
    cinza: '#9095a1',
    chumbo: '#5d626d',
    rosa: '#efb6c7',
    vermelho: '#b44e67',
    verde: '#648c6c',
    marrom: '#7e6050',
    caramelo: '#a56f4a',
    terracota: '#a55a42',
    camel: '#b8895d',
    vinho: '#6f2c3e',
    lilas: '#a593bc',
    roxo: '#7e5f9c',
    dourado: '#c8a65a',
    prata: '#b7b7bc',
  };

  return palette[normalized] || '#d5bac2';
}

export function pickInitialVariant(variants: CatalogVariant[]): CatalogVariant {
  return variants.find((variant) => variant.stock > 0) || variants[0];
}

export function toInstallmentLabel(price: number, maxInstallments = 3): string | null {
  const MIN_PER_INSTALLMENT = 10;
  if (price < MIN_PER_INSTALLMENT * maxInstallments) return null;
  return `${maxInstallments}× ${toCurrency(price / maxInstallments)} sem juros`;
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
