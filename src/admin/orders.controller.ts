import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { getPaymentById } from '../checkout/asaas.service';
import { sendCustomerStatusEmail, sendPaidOrderNotifications } from '../orders/order-notification.service';
import { syncOrderStockForStatusTransition } from '../orders/order-stock.service';

const VALID_STATUSES = ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'OVERDUE', 'REFUNDED'];
const VALID_SHIPPING = ['CORREIOS', 'PAC', 'SEDEX', 'UBER', 'PICKUP'];

const PAYMENT_STATUS_MAP: Record<string, string> = {
  RECEIVED: 'PAID',
  CONFIRMED: 'PAID',
  RECEIVED_IN_CASH: 'PAID',
  OVERDUE: 'OVERDUE',
  DELETED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'REFUNDED',
  CHARGEBACK_REQUESTED: 'CANCELLED',
  CHARGEBACK_DISPUTE: 'CANCELLED',
};

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
    const order = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          items: {
            select: {
              variantId: true,
              quantity: true,
            },
          },
        },
      });

      if (!existingOrder) {
        throw Object.assign(new Error('Pedido não encontrado.'), { code: 'P2025' });
      }

      const updateData: Record<string, unknown> = {};
      if (status) updateData.status = status;
      if (shippingMethod !== undefined) updateData.shippingMethod = shippingMethod;
      if (trackingCode !== undefined) updateData.trackingCode = trackingCode || null;
      if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl || null;

      if (status) {
        await syncOrderStockForStatusTransition(tx, {
          orderId: existingOrder.id,
          previousStatus: existingOrder.status,
          nextStatus: status,
          items: existingOrder.items,
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: updateData,
      });

      if (status) {
        await tx.orderStatusUpdate.create({
          data: { orderId: id, status, note: note?.trim() || null },
        });
      }

      return updatedOrder;
    });

    if (status === 'PAID') {
      await sendPaidOrderNotifications(order.id);
    } else if (status) {
      await sendCustomerStatusEmail(order.id, status);
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

export async function reconcileOrderPayment(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, paymentId: true },
    });

    if (!order) {
      res.status(404).json({ message: 'Pedido não encontrado.' });
      return;
    }

    if (!order.paymentId) {
      res.status(400).json({ message: 'Pedido sem paymentId para reconciliação.' });
      return;
    }

    const payment = await getPaymentById(order.paymentId);
    const providerStatus = String(payment.status || '').toUpperCase();
    const mappedStatus = PAYMENT_STATUS_MAP[providerStatus];

    if (!mappedStatus) {
      res.status(422).json({
        message: `Status do Asaas não mapeado: ${providerStatus || 'DESCONHECIDO'}`,
        asaasStatus: providerStatus || null,
      });
      return;
    }

    if (mappedStatus === order.status) {
      res.json({
        updated: false,
        orderId: order.id,
        status: order.status,
        asaasStatus: providerStatus,
      });
      return;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: order.id },
        select: {
          id: true,
          status: true,
          items: {
            select: {
              variantId: true,
              quantity: true,
            },
          },
        },
      });

      if (!existingOrder) {
        throw Object.assign(new Error('Pedido não encontrado.'), { code: 'P2025' });
      }

      await syncOrderStockForStatusTransition(tx, {
        orderId: existingOrder.id,
        previousStatus: existingOrder.status,
        nextStatus: mappedStatus,
        items: existingOrder.items,
      });

      const reconciledOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: mappedStatus },
        select: { id: true, status: true },
      });

      await tx.orderStatusUpdate.create({
        data: {
          orderId: order.id,
          status: mappedStatus,
          note: `Reconciliação manual Asaas (${providerStatus})`,
        },
      });

      return reconciledOrder;
    });

    if (mappedStatus === 'PAID') {
      await sendPaidOrderNotifications(updatedOrder.id);
    } else {
      await sendCustomerStatusEmail(updatedOrder.id, mappedStatus);
    }

    res.json({
      updated: true,
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      asaasStatus: providerStatus,
    });
  } catch (error) {
    console.error('[admin/orders/:id/reconcile-payment]', error);
    res.status(500).json({ message: 'Erro ao reconciliar pagamento do pedido.' });
  }
}
