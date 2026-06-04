import { Request, Response } from 'express';
import { prisma } from '../config/database';

const VALID_EVENT_TYPES = new Set([
  'page_view',
  'product_view',
  'variant_select',
  'add_to_cart',
  'checkout_start',
  'checkout_complete',
]);

export async function trackEvent(req: Request, res: Response): Promise<void> {
  const {
    sessionId,
    eventType,
    page,
    productId,
    payload,
    referrer,
    utmSource,
    utmMedium,
    utmCampaign,
  } = req.body;

  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    res.status(400).json({ error: 'sessionId inválido.' });
    return;
  }

  if (!eventType || !VALID_EVENT_TYPES.has(eventType)) {
    res.status(400).json({ error: 'eventType inválido.' });
    return;
  }

  const userAgent = req.headers['user-agent']?.slice(0, 512) ?? null;

  const linkedEmail: string | null =
    payload?.email && typeof payload.email === 'string' ? payload.email : null;
  const linkedCpf: string | null =
    payload?.cpf && typeof payload.cpf === 'string' ? payload.cpf : null;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.analyticsSession.findUnique({
      where: { sessionId },
      select: { sessionId: true },
    });

    if (!existing) {
      await tx.analyticsSession.create({
        data: {
          sessionId,
          referrer: referrer ?? null,
          utmSource: utmSource ?? null,
          utmMedium: utmMedium ?? null,
          utmCampaign: utmCampaign ?? null,
          userAgent,
          pageCount: 1,
          linkedEmail,
          linkedCpf,
        },
      });
    } else {
      await tx.analyticsSession.update({
        where: { sessionId },
        data: {
          lastSeen: new Date(),
          pageCount: { increment: 1 },
          ...(linkedEmail ? { linkedEmail } : {}),
          ...(linkedCpf ? { linkedCpf } : {}),
        },
      });
    }

    await tx.analyticsEvent.create({
      data: {
        sessionId,
        eventType,
        page: page ?? null,
        productId: productId ?? null,
        payload: payload ?? undefined,
      },
    });
  });

  res.status(202).end();
}