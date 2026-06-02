import axios from 'axios';
import type {
  ApiProduct,
  AuthLoginResponse,
  AuthMessageResponse,
  AuthRegisterResponse,
  AuthUser,
  CatalogProduct,
  CheckoutInstallmentsResponse,
  CheckoutPayload,
  CheckoutResponse,
  CouponValidationResponse,
  Order,
} from '../types';

const TOKEN_KEY = 'magic.auth.token';
const IMAGE_WATERMARK_VERSION = '20260602';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    'https://magic-ecomerce-api-731025483706.us-central1.run.app',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      (error.response?.data as { message?: string } | undefined)?.message || error.message;
    return Promise.reject(new Error(message));
  },
);

const DEFAULT_API_BASE_URL = 'https://magic-ecomerce-api-731025483706.us-central1.run.app';

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function dedupeBaseUrls(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean).map(normalizeBaseUrl)));
}

function getCatalogApiBaseCandidates(): string[] {
  const primary = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
  const envFallback = String(import.meta.env.VITE_API_FALLBACK_BASE_URL || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const candidates = [primary, ...envFallback];

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      candidates.push('http://localhost:3001');
    }
  }

  return dedupeBaseUrls(candidates);
}

function toNumber(value: string | number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fallbackImage(name: string): string {
  const encoded = encodeURIComponent(name);
  return `https://placehold.co/700x900/34363d/f0c6d0?text=${encoded}`;
}

function decodeUriSafely(value: string): string {
  let decoded = value;
  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function normalizeObjectPath(candidate: string): string {
  return decodeUriSafely(candidate.replace(/^\/+/, '').trim());
}

function extractGcsObjectPath(imageUrl: string): string | null {
  const knownBucket = String(import.meta.env.VITE_GCP_BUCKET_NAME || 'magic-ecommerce-fotos').trim();

  // Already an object path.
  if (imageUrl.startsWith('produtos/')) {
    return normalizeObjectPath(imageUrl);
  }

  try {
    const parsed = new URL(imageUrl);

    // Already proxied through our own API.
    if (parsed.pathname === '/products/images/object') {
      const proxiedPath = parsed.searchParams.get('path');
      return proxiedPath ? normalizeObjectPath(proxiedPath) : null;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);

    if (parsed.hostname === 'storage.googleapis.com') {
      if (segments.length === 0) return null;

      const first = normalizeObjectPath(segments[0]);
      if (first === knownBucket && segments.length > 1) {
        return normalizeObjectPath(segments.slice(1).join('/'));
      }

      return normalizeObjectPath(segments.join('/'));
    }

    if (parsed.hostname.endsWith('.storage.googleapis.com')) {
      if (segments.length === 0) return null;
      return normalizeObjectPath(segments.join('/'));
    }
  } catch {
    return null;
  }

  return null;
}

function toOptimizedCatalogImageUrl(
  imageUrl: string,
  apiBaseUrl: string,
  options: { width: number; quality: number; format: 'webp' | 'jpeg' | 'png' }
): string {
  const objectPath = extractGcsObjectPath(imageUrl);
  if (!objectPath || !objectPath.startsWith('produtos/')) {
    return imageUrl;
  }

  return `${apiBaseUrl}/products/images/object?path=${encodeURIComponent(objectPath)}&w=${options.width}&q=${options.quality}&fm=${options.format}&wm=${IMAGE_WATERMARK_VERSION}`;
}

export function mapProductsToCatalog(products: ApiProduct[], apiBaseUrl: string): CatalogProduct[] {
  return products
    .filter((product) => product.variants.length > 0)
    .map((product) => {
      const sourceImages = product.images?.length ? product.images : [];

      const transformedImages = product.images?.length
        ? sourceImages.map((url) =>
            toOptimizedCatalogImageUrl(url, apiBaseUrl, {
              width: 1280,
              quality: 78,
              format: 'webp',
            })
          )
        : [fallbackImage(product.name)];

      const listImage = sourceImages[0]
        ? toOptimizedCatalogImageUrl(sourceImages[0], apiBaseUrl, {
            width: 760,
            quality: 70,
            format: 'webp',
          })
        : fallbackImage(product.name);

      return {
        productId: product.id,
        name: product.name,
        description: product.description || 'Seleção MAGI.C para o seu guarda-roupa.',
        category: product.category,
        imageUrl: listImage,
        images: transformedImages,
        price: toNumber(product.basePrice),
        variants: product.variants.map((variant) => ({
          variantId: variant.id,
          productId: product.id,
          color: variant.color,
          size: variant.size,
          barcode: variant.barcode || 'Sem código',
          stock: variant.stock,
        })),
      };
    });
}

export async function fetchCatalog(): Promise<CatalogProduct[]> {
  const baseCandidates = getCatalogApiBaseCandidates();
  const errors: string[] = [];

  for (const baseURL of baseCandidates) {
    try {
      const client = axios.create({ baseURL, timeout: 15000 });
      const response = await client.get<ApiProduct[]>('/products');
      return mapProductsToCatalog(response.data || [], baseURL);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        errors.push(status ? `${baseURL} (${status})` : `${baseURL} (sem resposta)`);
      } else {
        errors.push(`${baseURL} (erro desconhecido)`);
      }
    }
  }

  throw new Error(`Falha ao consultar catalogo em: ${errors.join(', ')}`);
}

export async function checkout(payload: CheckoutPayload): Promise<CheckoutResponse> {
  try {
    const { data } = await api.post<CheckoutResponse>('/checkout', payload);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiMessage = error.response?.data?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
        throw new Error(apiMessage.trim());
      }
    }
    throw error;
  }
}

export async function validateCoupon(
  code: string,
  subtotal: number,
  identity?: { email?: string; cpf?: string },
): Promise<CouponValidationResponse> {
  const { data } = await api.post<CouponValidationResponse>('/checkout/validate-coupon', {
    code,
    subtotal,
    email: identity?.email,
    cpf: identity?.cpf,
  });
  return data;
}

export async function getShippingRates(cep: string, quantity: number) {
  const { data } = await api.get<import('../types').ShippingRateOption[]>('/checkout/shipping-rates', {
    params: { cep, quantity },
  });
  return data;
}

export async function getCheckoutInstallments(total: number): Promise<CheckoutInstallmentsResponse> {
  const normalizedTotal = Number.isFinite(total) ? total : 0;
  const { data } = await api.get<CheckoutInstallmentsResponse>('/checkout/installments', {
    params: { total: normalizedTotal.toFixed(2) },
  });
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function authRegister(
  name: string,
  email: string,
  password: string
): Promise<AuthRegisterResponse> {
  try {
    const { data } = await api.post<AuthRegisterResponse>('/auth/register', { name, email, password });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiMessage = error.response?.data?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
        throw new Error(apiMessage.trim());
      }
    }

    throw error;
  }
}

export async function authLogin(
  email: string,
  password: string
): Promise<AuthLoginResponse> {
  const { data } = await api.post<AuthLoginResponse>('/auth/login', { email, password });
  return data;
}

export async function requestEmailVerification(email: string): Promise<AuthMessageResponse> {
  const { data } = await api.post<AuthMessageResponse>('/auth/request-verification', { email });
  return data;
}

export async function verifyEmail(token: string): Promise<AuthMessageResponse> {
  const { data } = await api.get<AuthMessageResponse>('/auth/verify-email', {
    params: { token },
  });
  return data;
}

export async function requestPasswordReset(email: string): Promise<AuthMessageResponse> {
  const { data } = await api.post<AuthMessageResponse>('/auth/request-password-reset', { email });
  return data;
}

export async function resetPassword(token: string, password: string): Promise<AuthMessageResponse> {
  const { data } = await api.post<AuthMessageResponse>('/auth/reset-password', { token, password });
  return data;
}

export async function authMe(token: string): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function lookupOrders(email: string, cpf: string): Promise<Order[]> {
  const { data } = await api.get('/orders/lookup', { params: { email, cpf } });
  return data;
}

export async function getMyOrders(token: string): Promise<Order[]> {
  const { data } = await api.get('/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}
