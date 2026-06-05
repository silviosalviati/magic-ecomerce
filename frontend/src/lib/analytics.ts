const SESSION_KEY = 'magic.session.id';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'https://magic-ecomerce-api-731025483706.us-central1.run.app';

const AUTH_TOKEN_KEY = 'magic.auth.token';

// ── Session ID ────────────────────────────────────────────────────────────────

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isAdminUserSession(): boolean {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return false;
    const payload = parseJwtPayload(token);
    return Boolean(payload?.isAdmin === true);
  } catch {
    return false;
  }
}

// ── UTM / source helpers ──────────────────────────────────────────────────────

const SOURCE_ALIASES: Record<string, string> = {
  ig: 'instagram',
  insta: 'instagram',
  instagram: 'instagram',
  fb: 'facebook',
  face: 'facebook',
  facebook: 'facebook',
  google: 'google',
  wa: 'whatsapp',
  wpp: 'whatsapp',
  whatsapp: 'whatsapp',
  tiktok: 'tiktok',
  youtube: 'youtube',
  yt: 'youtube',
  twitter: 'twitter',
  x: 'twitter',
  pinterest: 'pinterest',
  yahoo: 'yahoo',
  bing: 'bing',
  linktree: 'linktree',
};

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

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function hostToPrimaryLabel(hostname: string): string {
  const clean = hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '').replace(/^l\./, '');
  const parts = clean.split('.').filter(Boolean);
  if (parts.length <= 1) return parts[0] || clean;

  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  const genericSecondLevel = new Set(['com', 'net', 'org', 'gov', 'edu']);

  if (last.length === 2 && genericSecondLevel.has(secondLast) && parts.length >= 3) {
    return parts[parts.length - 3];
  }

  return secondLast;
}

function normalizeSourceLabel(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const value = normalizeToken(String(raw));
  if (!value) return undefined;

  if (SOURCE_ALIASES[value]) return SOURCE_ALIASES[value];

  const firstToken = value.split(/[._-]/)[0];
  if (SOURCE_ALIASES[firstToken]) return SOURCE_ALIASES[firstToken];

  let hostCandidate = value;
  if (String(raw).startsWith('http://') || String(raw).startsWith('https://')) {
    try {
      hostCandidate = new URL(String(raw)).hostname;
    } catch {
      return value;
    }
  }

  for (const [pattern, label] of REFERRER_MAP) {
    if (pattern.test(String(raw)) || pattern.test(hostCandidate)) return label;
  }

  if (hostCandidate.includes('.')) {
    return normalizeToken(hostToPrimaryLabel(hostCandidate));
  }

  return value;
}

function inferSourceFromReferrer(referrer: string): string | undefined {
  if (!referrer) return undefined;
  return normalizeSourceLabel(referrer);
}

function getUtmParams(): Record<string, string | undefined> {
  const params = new URLSearchParams(location.search);
  const utmSource =
    normalizeSourceLabel(params.get('utm_source')) ??
    inferSourceFromReferrer(document.referrer);
  return {
    utmSource: utmSource ?? undefined,
    utmMedium: normalizeToken(params.get('utm_medium') ?? '' ) || undefined,
    utmCampaign: normalizeToken(params.get('utm_campaign') ?? '' ) || undefined,
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
  if (location.pathname.startsWith('/admin') || isAdminUserSession()) {
    return;
  }

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