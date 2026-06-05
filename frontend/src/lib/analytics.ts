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

// ── UTM / source helpers ──────────────────────────────────────────────────────

const REFERRER_MAP: [RegExp, string][] = [
  [/instagram\.com/i,  'instagram'],
  [/facebook\.com/i,   'facebook'],
  [/fb\.com/i,         'facebook'],
  [/wa\.me/i,          'whatsapp'],
  [/whatsapp\.com/i,   'whatsapp'],
  [/tiktok\.com/i,     'tiktok'],
  [/youtube\.com/i,    'youtube'],
  [/youtu\.be/i,       'youtube'],
  [/pinterest\.com/i,  'pinterest'],
  [/twitter\.com/i,    'twitter'],
  [/x\.com/i,          'twitter'],
  [/google\./i,        'google'],
  [/bing\.com/i,       'bing'],
  [/yahoo\.com/i,      'yahoo'],
  [/t\.co\//i,         'twitter'],
  [/linktree/i,        'linktree'],
];

function inferSourceFromReferrer(referrer: string): string | undefined {
  if (!referrer) return undefined;
  try {
    const hostname = new URL(referrer).hostname.replace(/^www\./, '');
    for (const [pattern, label] of REFERRER_MAP) {
      if (pattern.test(referrer)) return label;
    }
    // Return the bare domain as fallback (e.g. "loja.parceiro.com.br")
    return hostname || undefined;
  } catch {
    return undefined;
  }
}

function getUtmParams(): Record<string, string | undefined> {
  const params = new URLSearchParams(location.search);
  const utmSource = params.get('utm_source') ?? inferSourceFromReferrer(document.referrer);
  return {
    utmSource: utmSource ?? undefined,
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