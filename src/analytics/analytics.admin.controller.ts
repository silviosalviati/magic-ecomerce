import { Request, Response } from 'express';
import { prisma } from '../config/database';

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
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

  const groups = await prisma.analyticsSession.groupBy({
    by: ['utmSource'],
    _count: { sessionId: true },
    where: { firstSeen: { gte: periodStart } },
    orderBy: { _count: { sessionId: 'desc' } },
    take: 10,
  });

  const total = groups.reduce((sum, g) => sum + g._count.sessionId, 0);

  res.json(
    groups.map((g) => ({
      source: g.utmSource ?? 'direto',
      sessions: g._count.sessionId,
      percentage: total > 0 ? +((g._count.sessionId / total) * 100).toFixed(1) : 0,
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
      source: s.utmSource ?? s.referrer ?? 'direto',
      linkedEmail: s.linkedEmail,
      lastStage: s.events[0]?.eventType ?? null,
    })),
  });
}