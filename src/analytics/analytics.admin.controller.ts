import { Request, Response } from 'express';
import { prisma } from '../config/database';

const BRAZIL_TZ = 'America/Sao_Paulo';

const FUNNEL_STAGES = [
  'page_view',
  'product_view',
  'add_to_cart',
  'checkout_start',
  'checkout_complete',
] as const;

function getPeriodStart(period: string): Date {
  const now = new Date();
  if (period === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return getStartOfTodayInTimezone(BRAZIL_TZ, now);
}

function getStartOfTodayInTimezone(timeZone: string, now: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '0');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '1');

  const utcMidnightGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offsetMs = getTimeZoneOffsetMs(utcMidnightGuess, timeZone);
  return new Date(utcMidnightGuess.getTime() - offsetMs);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '0');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '1');
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const second = Number(parts.find((p) => p.type === 'second')?.value ?? '0');

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

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
  direct: 'direto',
  direto: 'direto',
};

const SOURCE_HOST_PATTERNS: [RegExp, string][] = [
  [/instagram\.com/i, 'instagram'],
  [/facebook\.com/i, 'facebook'],
  [/fb\.com/i, 'facebook'],
  [/google\./i, 'google'],
  [/wa\.me/i, 'whatsapp'],
  [/whatsapp\.com/i, 'whatsapp'],
  [/tiktok\.com/i, 'tiktok'],
  [/youtube\.com/i, 'youtube'],
  [/youtu\.be/i, 'youtube'],
  [/twitter\.com/i, 'twitter'],
  [/x\.com/i, 'twitter'],
  [/pinterest\.com/i, 'pinterest'],
  [/bing\.com/i, 'bing'],
  [/yahoo\.com/i, 'yahoo'],
  [/linktree/i, 'linktree'],
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

function normalizeSourceLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = normalizeToken(String(raw));
  if (!value) return null;

  if (SOURCE_ALIASES[value]) return SOURCE_ALIASES[value];

  const firstToken = value.split(/[._-]/)[0];
  if (SOURCE_ALIASES[firstToken]) return SOURCE_ALIASES[firstToken];

  let hostCandidate = value;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      hostCandidate = new URL(value).hostname;
    } catch {
      return value;
    }
  }

  for (const [pattern, label] of SOURCE_HOST_PATTERNS) {
    if (pattern.test(hostCandidate) || pattern.test(value)) return label;
  }

  if (hostCandidate.includes('.')) {
    return hostToPrimaryLabel(hostCandidate);
  }

  return value;
}

export async function getOverview(req: Request, res: Response): Promise<void> {
  const periodStart = getPeriodStart(String(req.query.period ?? 'today'));

  const [sessions, eventGroups] = await Promise.all([
    prisma.analyticsSession.count({ where: { firstSeen: { gte: periodStart } } }),
    prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      _count: { id: true },
      where: { createdAt: { gte: periodStart } },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const g of eventGroups) counts[g.eventType] = g._count.id;

  const orders = counts['checkout_complete'] ?? 0;

  res.json({
    sessions,
    pageViews: counts['page_view'] ?? 0,
    addToCart: counts['add_to_cart'] ?? 0,
    checkouts: counts['checkout_start'] ?? 0,
    orders,
    conversionRate: sessions > 0 ? +((orders / sessions) * 100).toFixed(2) : 0,
  });
}

export async function getFunnel(req: Request, res: Response): Promise<void> {
  const periodStart = getPeriodStart(String(req.query.period ?? 'today'));

  // Distinct (sessionId, eventType) pairs — counts unique sessions per stage
  const pairs = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: { gte: periodStart },
      eventType: { in: [...FUNNEL_STAGES] },
    },
    select: { sessionId: true, eventType: true },
    distinct: ['sessionId', 'eventType'],
  });

  const stageCounts: Record<string, number> = {};
  for (const p of pairs) {
    stageCounts[p.eventType] = (stageCounts[p.eventType] ?? 0) + 1;
  }

  res.json(
    FUNNEL_STAGES.map((stage) => ({
      stage,
      sessions: stageCounts[stage] ?? 0,
    }))
  );
}

export async function getSources(req: Request, res: Response): Promise<void> {
  const periodStart = getPeriodStart(String(req.query.period ?? 'today'));

  const sessions = await prisma.analyticsSession.findMany({
    where: { firstSeen: { gte: periodStart } },
    select: { utmSource: true, referrer: true },
  });

  // Resolve label: utmSource → referrer domain → 'direto'
  const sourceCount = new Map<string, number>();
  for (const s of sessions) {
    const label = normalizeSourceLabel(s.utmSource) ?? normalizeSourceLabel(s.referrer);
    const key = label ?? 'direto';
    sourceCount.set(key, (sourceCount.get(key) ?? 0) + 1);
  }

  const total = sessions.length;
  const sorted = [...sourceCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  res.json(
    sorted.map(([source, count]) => ({
      source,
      sessions: count,
      percentage: total > 0 ? +((count / total) * 100).toFixed(1) : 0,
    }))
  );
}

export async function getTopProducts(req: Request, res: Response): Promise<void> {
  const periodStart = getPeriodStart(String(req.query.period ?? 'today'));

  const events = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: { gte: periodStart },
      eventType: { in: ['product_view', 'add_to_cart'] },
      productId: { not: null },
    },
    select: { productId: true, eventType: true },
  });

  const map = new Map<string, { views: number; addToCart: number }>();
  for (const e of events) {
    const pid = e.productId!;
    if (!map.has(pid)) map.set(pid, { views: 0, addToCart: 0 });
    const entry = map.get(pid)!;
    if (e.eventType === 'product_view') entry.views++;
    else entry.addToCart++;
  }

  const productIds = Array.from(map.keys());
  if (productIds.length === 0) {
    res.json([]);
    return;
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });

  const result = products
    .map((p) => {
      const stats = map.get(p.id)!;
      return {
        productId: p.id,
        name: p.name,
        views: stats.views,
        addToCart: stats.addToCart,
        cartRate:
          stats.views > 0 ? +((stats.addToCart / stats.views) * 100).toFixed(1) : 0,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  res.json(result);
}

export async function getSessions(req: Request, res: Response): Promise<void> {
  const periodStart = getPeriodStart(String(req.query.period ?? 'today'));
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
  const pageSize = 20;

  const [total, sessions] = await Promise.all([
    prisma.analyticsSession.count({ where: { firstSeen: { gte: periodStart } } }),
    prisma.analyticsSession.findMany({
      where: { firstSeen: { gte: periodStart } },
      orderBy: { firstSeen: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { eventType: true },
        },
      },
    }),
  ]);

  res.json({
    total,
    page,
    pageSize,
    sessions: sessions.map((s) => ({
      sessionId: s.sessionId.slice(0, 8),
      firstSeen: s.firstSeen,
      lastSeen: s.lastSeen,
      pageCount: s.pageCount,
      source: normalizeSourceLabel(s.utmSource) ?? normalizeSourceLabel(s.referrer) ?? 'direto',
      linkedEmail: s.linkedEmail,
      lastStage: s.events[0]?.eventType ?? null,
    })),
  });
}