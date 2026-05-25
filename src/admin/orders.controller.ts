import { Request, Response } from 'express';
import { prisma } from '../config/database';

const VALID_STATUSES = ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'OVERDUE', 'REFUNDED'];
const VALID_SHIPPING = ['CORREIOS', 'UBER', 'PICKUP'];

export async function listOrders(req: Request, res: Response): Promise<void> {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const page = typeof req.query.page === 'string' ? req.query.page : '1';
  const limit = typeof req.query.limit === 'string' ? req.query.limit : '20';

  const take = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (Math.max(1, Number(page) || 1) - 1) * take;

  try {
    const where = status ? { status } : {};
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: { variant: { include: { product: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        paymentMethod: o.paymentMethod,
        total: o.total,
        createdAt: o.createdAt,
        guestName: o.guestName,
        guestEmail: o.guestEmail,
        shippingMethod: o.shippingMethod,
        trackingCode: o.trackingCode,
        itemCount: o.items.length,
      })),
      total,
      page: Number(page),
      pages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('[admin/orders]', error);
    res.status(500).json({ message: 'Erro ao listar pedidos.' });
  }
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { variant: { include: { product: true } } },
        },
        statusUpdates: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) {
      res.status(404).json({ message: 'Pedido não encontrado.' });
      return;
    }

    res.json(order);
  } catch (error) {
    console.error('[admin/orders/:id]', error);
    res.status(500).json({ message: 'Erro ao buscar pedido.' });
  }
}

export async function updateOrder(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const {
    status,
    shippingMethod,
    trackingCode,
    trackingUrl,
    note,
  }: {
    status?: string;
    shippingMethod?: string;
    trackingCode?: string;
    trackingUrl?: string;
    note?: string;
  } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    res.status(400).json({ message: `Status inválido. Use: ${VALID_STATUSES.join(', ')}` });
    return;
  }

  if (shippingMethod && !VALID_SHIPPING.includes(shippingMethod)) {
    res.status(400).json({ message: `Método de envio inválido. Use: ${VALID_SHIPPING.join(', ')}` });
    return;
  }

  try {
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (shippingMethod !== undefined) updateData.shippingMethod = shippingMethod;
    if (trackingCode !== undefined) updateData.trackingCode = trackingCode || null;
    if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl || null;

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    if (status) {
      await prisma.orderStatusUpdate.create({
        data: { orderId: id, status, note: note?.trim() || null },
      });
    }

    res.json(order);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      res.status(404).json({ message: 'Pedido não encontrado.' });
      return;
    }
    console.error('[admin/orders/:id PATCH]', error);
    res.status(500).json({ message: 'Erro ao atualizar pedido.' });
  }
}
