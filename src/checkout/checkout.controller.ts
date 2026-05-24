import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../config/database';
import { findOrCreateCustomer, createPixPayment, getPixQrCode } from './asaas.service';

interface CheckoutItem {
  variantId: string;
  quantity: number;
  priceAtPurchase: number;
}

interface CheckoutBody {
  name: string;
  email: string;
  cpf: string;
  items: CheckoutItem[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createCheckout(req: Request, res: Response): Promise<void> {
  const { name, email, cpf, items } = req.body as CheckoutBody;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!name?.trim() || !email?.trim() || !cpf || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ message: 'name, email, cpf e items são obrigatórios.' });
    return;
  }

  const cpfClean = String(cpf).replace(/\D/g, '');
  if (cpfClean.length !== 11) {
    res.status(400).json({ message: 'CPF inválido.' });
    return;
  }

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ message: 'E-mail inválido.' });
    return;
  }

  for (const item of items) {
    if (!item.variantId || item.quantity < 1 || item.priceAtPurchase <= 0) {
      res.status(400).json({ message: 'Item inválido na sacola.' });
      return;
    }
  }

  try {
    // ── Verify stock ──────────────────────────────────────────────────────
    const variantIds = items.map((i) => i.variantId);
    const variants = await prisma.variant.findMany({ where: { id: { in: variantIds } } });

    for (const item of items) {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) {
        res.status(400).json({ message: `Produto não encontrado: ${item.variantId}` });
        return;
      }
      if (variant.stock < item.quantity) {
        res.status(400).json({
          message: `Estoque insuficiente: ${variant.color} ${variant.size} (disponível: ${variant.stock})`,
        });
        return;
      }
    }

    const total = items.reduce((sum, i) => sum + i.priceAtPurchase * i.quantity, 0);

    // ── Create Asaas customer + PIX payment ───────────────────────────────
    const customer = await findOrCreateCustomer(name.trim(), email.trim(), cpfClean);
    const payment = await createPixPayment(customer.id, total, 'Compra MAGI.C');
    const pix = await getPixQrCode(payment.id);

    // ── Persist order ─────────────────────────────────────────────────────
    const order = await prisma.order.create({
      data: {
        total,
        status: 'PENDING',
        paymentId: payment.id,
        guestName: name.trim(),
        guestEmail: email.trim(),
        guestCpf: cpfClean,
        pixQrCode: pix.encodedImage,
        pixCopyPaste: pix.payload,
        pixExpiresAt: pix.expirationDate ? new Date(pix.expirationDate) : null,
        items: {
          create: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
            priceAtPurchase: i.priceAtPurchase,
          })),
        },
      },
    });

    res.json({
      orderId: order.id,
      pixQrCode: pix.encodedImage,
      pixCopyPaste: pix.payload,
      pixExpiresAt: pix.expirationDate ?? null,
      total,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = Number(error.response?.status || 0);
      console.error('[checkout][asaas]', {
        status,
        data: error.response?.data,
        message: error.message,
      });

      if (status === 401 || status === 403) {
        res.status(503).json({
          message: 'Pagamento PIX indisponível no momento. Tente novamente em instantes.',
        });
        return;
      }

      if (status === 429) {
        res.status(503).json({
          message: 'Pagamento PIX temporariamente sobrecarregado. Tente novamente em alguns minutos.',
        });
        return;
      }
    } else {
      console.error('[checkout]', error);
    }
    res.status(500).json({ message: 'Erro ao processar pagamento. Tente novamente.' });
  }
}

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  const expectedSecret = process.env.ASAAS_WEBHOOK_SECRET?.trim();
  if (expectedSecret) {
    const providedSecret = String(req.headers['x-webhook-secret'] || '').trim();
    if (providedSecret !== expectedSecret) {
      res.sendStatus(401);
      return;
    }
  }

  const { event, payment } = req.body as {
    event: string;
    payment?: { id: string; status: string };
  };

  if (!payment?.id) {
    res.sendStatus(200);
    return;
  }

  const statusMap: Record<string, string> = {
    PAYMENT_RECEIVED: 'PAID',
    PAYMENT_CONFIRMED: 'PAID',
    PAYMENT_OVERDUE: 'OVERDUE',
    PAYMENT_DELETED: 'CANCELLED',
    PAYMENT_REFUNDED: 'REFUNDED',
  };

  const newStatus = statusMap[event];
  if (!newStatus) {
    res.sendStatus(200);
    return;
  }

  try {
    await prisma.order.updateMany({
      where: { paymentId: payment.id },
      data: { status: newStatus },
    });
    res.sendStatus(200);
  } catch (error) {
    console.error('[webhook]', error);
    res.sendStatus(500);
  }
}
