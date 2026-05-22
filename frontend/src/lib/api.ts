import axios from 'axios';
import type { ApiProduct, CatalogProduct } from '../types';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    'https://magic-ecomerce-api-731025483706.us-central1.run.app',
  timeout: 15000,
});

function toNumber(value: string | number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fallbackImage(name: string): string {
  const encoded = encodeURIComponent(name);
  return `https://placehold.co/700x900/34363d/f0c6d0?text=${encoded}`;
}

export function mapProductsToCatalog(products: ApiProduct[]): CatalogProduct[] {
  return products
    .filter((product) => product.variants.length > 0)
    .map((product) => ({
      productId: product.id,
      name: product.name,
      description: product.description || 'Seleção MAGI.C para o seu guarda-roupa.',
      category: product.category,
      imageUrl: product.images?.[0] || fallbackImage(product.name),
      images: product.images?.length
        ? product.images
        : [fallbackImage(product.name)],
      price: toNumber(product.basePrice),
      variants: product.variants.map((variant) => ({
        variantId: variant.id,
        productId: product.id,
        color: variant.color,
        size: variant.size,
        barcode: variant.barcode || 'Sem código',
        stock: variant.stock,
      })),
    }));
}

export async function fetchCatalog(): Promise<CatalogProduct[]> {
  const response = await api.get<ApiProduct[]>('/products');
  return mapProductsToCatalog(response.data || []);
}
