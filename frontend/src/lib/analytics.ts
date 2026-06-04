const SESSION_KEY = 'magic.session.id';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'https://magic-ecomerce-api-731025483706.us-central1.run.app';

// ── Session ID ────────────────────────────────────────────────────────────────

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// ── UTM helpers ───────────────────────────────────────────────────────────────

function getUtmParams(): Record<string, string | undefined> {
  const params = new URLSearchParams(location.search);
  return {
    utmSource: params.get('utm_source') ?? undefined,
    utmMedium: params.get('utm_medium') ?? undefined,
    utmCampaign: params.get('utm_campaign') ?? undefined,
  };
}

// ── Core send ─────────────────────────────────────────────────────────────────

type EventType =
  | 'page_view'
  | 'product_view'
  | 'variant_select'
  | 'add_to_cart'
  | 'checkout_start'
  | 'checkout_complete';

interface TrackPayload {
  eventType: EventType;
  page?: string;
  productId?: string;
  payload?: Record<string, unknown>;
}

function send(data: TrackPayload): void {
  const body = JSON.stringify({
    sessionId: getSessionId(),
    referrer: document.referrer || undefined,
    ...getUtmParams(),
    ...data,
  });

  // keepalive keeps the request alive even if the page unloads
  fetch(`${API_BASE}/analytics/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // silent — analytics must never break the app
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export function trackPageView(page: string): void {
  send({ eventType: 'page_view', page });
}

export function trackProductView(productId: string, page: string): void {
  send({ eventType: 'product_view', productId, page });
}

export function trackVariantSelect(
  productId: string,
  variantId: string,
  size: string,
  color: string,
): void {
  send({ eventType: 'variant_select', productId, payload: { variantId, size, color } });
}

export function trackAddToCart(
  productId: string,
  variantId: string,
  qty: number,
): void {
  send({ eventType: 'add_to_cart', productId, payload: { variantId, qty } });
}

export function trackCheckoutStart(
  itemCount: number,
  total: number,
  identity?: { cpf?: string; email?: string },
): void {
  send({ eventType: 'checkout_start', payload: { itemCount, total, ...identity } });
}

export function trackCheckoutComplete(
  orderId: string,
  total: number,
  identity?: { cpf?: string; email?: string },
): void {
  send({ eventType: 'checkout_complete', payload: { orderId, total, ...identity } });
}