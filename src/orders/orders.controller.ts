import { Request, Response } from 'express';
import { prisma } from '../config/database';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function lookupOrders(req: Request, res: Response): Promise<void> {
  const { email, cpf } = req.query as { email?: string; cpf?: string };

  if (!email?.trim() || !cpf?.trim()) {
    res.status(400).json({ message: 'email e cpf são obrigatórios.' });
    return;
  }

  const cpfClean = String(cpf).replace(/\D/g, '');
  const emailClean = String(email).trim().toLowerCase();

  if (cpfClean.length !== 11 || !EMAIL_RE.test(emailClean)) {
    res.status(400).json({ message: 'Dados de consulta inválidos.' });
    return;
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        guestEmail: { equals: emailClean, mode: 'insensitive' },
        guestCpf: cpfClean,
      },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        statusUpdates: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = orders.map((order) => ({
      id: order.id,
      status: order.status,
      paymentMethod: order.paymentMethod,
      total: order.total,
      createdAt: order.createdAt,
      shippingMethod: order.shippingMethod,
      trackingCode: order.trackingCode,
      trackingUrl: order.trackingUrl,
      address: order.addressStreet
        ? {
            street: order.addressStreet,
            number: order.addressNumber,
            complement: order.addressComplement,
            neighborhood: order.addressNeighborhood,
            city: order.addressCity,
            state: order.addressState,
            zip: order.addressZip,
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        productName: item.variant.product.name,
        color: item.variant.color,
        size: item.variant.size,
        productId: item.variant.productId,
      })),
      statusHistory: order.statusUpdates.map((u) => ({
        status: u.status,
        note: u.note,
        createdAt: u.createdAt,
      })),
    }));

    res.json(result);
  } catch (error) {
    console.error('[orders/lookup]', error);
    res.status(500).json({ message: 'Erro ao buscar pedidos.' });
  }
}

export async function getCustomerOrders(req: Request, res: Response): Promise<void> {
  const userId = (req as Request & { userId?: string }).userId;
  if (!userId) {
    res.status(401).json({ message: 'Não autenticado.' });
    return;
  }

  try {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            variant: { include: { product: true } },
          },
        },
        statusUpdates: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = orders.map((order) => ({
      id: order.id,
      status: order.status,
      paymentMethod: order.paymentMethod,
      total: order.total,
      createdAt: order.createdAt,
      shippingMethod: order.shippingMethod,
      trackingCode: order.trackingCode,
      trackingUrl: order.trackingUrl,
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        productName: item.variant.product.name,
        color: item.variant.color,
        size: item.variant.size,
        productId: item.variant.productId,
      })),
      statusHistory: order.statusUpdates.map((u) => ({
        status: u.status,
        note: u.note,
        createdAt: u.createdAt,
      })),
    }));

    res.json(result);
  } catch (error) {
    console.error('[orders/customer]', error);
    res.status(500).json({ message: 'Erro ao buscar pedidos.' });
  }
}
