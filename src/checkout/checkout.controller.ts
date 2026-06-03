import { Request, Response } from 'express';
import axios from 'axios';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { sendStoreNotification, sendCustomerConfirmation, sendPickupContactEmail } from '../config/mailer';
import { calculateShippingRates } from './melhorenvios.service';
import { notifyStoreWhatsApp } from '../config/whatsapp';
import { validateCoupon } from './coupon.service';
import {
  findOrCreateCustomer,
  createPixPayment,
  getPixQrCode,
  createBoletoPayment,
  getBoletoData,
  createCreditCardPayment,
  getPaymentLimits,
  simulateInstallments,
  type CreditCardData,
  type CreditCardHolderInfo,
} from './asaas.service';

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
  paymentMethod?: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  couponCode?: string;
  // Shipping
  shippingMethod?: string;
  shippingLabel?: string;
  shippingCost?: number;
  // Credit card fields
  cardHolderName?: string;
  cardNumber?: string;
  cardExpiry?: string; // "MM/YY"
  cardCvv?: string;
  phone?: string;
  postalCode?: string;
  addressNumber?: string;
  installments?: number;
  // Shipping address
  addressStreet?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthRequest = Request & { userId?: string };

interface InstallmentOptionDto {
  installments: number;
  installmentValue: number;
  total: number;
  hasInterest: boolean;
  interestAmount: number;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function isSandboxAsaas(): boolean {
  const base = String(process.env.ASAAS_BASE_URL || '').toLowerCase();
  return base.includes('sandbox');
}

function shouldUpdateStockOnPaidWebhook(): boolean {
  const configured = String(process.env.CHECKOUT_UPDATE_STOCK_ON_PAYMENT || '')
    .trim()
    .toLowerCase();

  if (configured === 'true') return true;
  if (configured === 'false') return false;

  // Default behavior: keep stock untouched in sandbox/test checkouts.
  return !isSandboxAsaas();
}

function buildFallbackInstallments(total: number): InstallmentOptionDto[] {
  return Array.from({ length: 12 }, (_, index) => {
    const installments = index + 1;
    const installmentValue = roundCurrency(total / installments);
    const resolvedTotal = roundCurrency(installmentValue * installments);
    return {
      installments,
      installmentValue,
      total: resolvedTotal,
      hasInterest: false,
      interestAmount: 0,
    };
  });
}

export async function getCheckoutInstallments(req: Request, res: Response): Promise<void> {
  const total = Number(req.query.total);

  if (!Number.isFinite(total) || total <= 0) {
    res.status(400).json({ message: 'Parametro total invalido.' });
    return;
  }

  try {
    const limits = await getPaymentLimits();
    const maxInstallments = Math.max(1, Math.min(12, limits.maxInstallmentCount ?? 12));

    const options: InstallmentOptionDto[] = [];
    for (let installments = 1; installments <= maxInstallments; installments += 1) {
      try {
        const simulation = await simulateInstallments(total, installments);
        if (!simulation) continue;

        const simulatedTotal = roundCurrency(simulation.totalValue);
        const installmentValue = roundCurrency(simulation.installmentValue);
        const interestAmount = roundCurrency(Math.max(0, simulatedTotal - total));

        options.push({
          installments,
          installmentValue,
          total: simulatedTotal,
          hasInterest: interestAmount > 0,
          interestAmount,
        });
      } catch {
        // Mantem resiliencia: se uma faixa falhar, continuamos nas outras.
      }
    }

    if (options.length === 0) {
      const fallback = buildFallbackInstallments(total);
      res.json({
        currency: 'BRL',
        source: 'fallback',
        maxNoInterestInstallments: fallback[fallback.length - 1].installments,
        options: fallback,
      });
      return;
    }

    options.sort((a, b) => a.installments - b.installments);

    const maxNoInterestInstallments = options
      .filter((option) => !option.hasInterest)
      .reduce((max, option) => Math.max(max, option.installments), 1);

    res.json({
      currency: 'BRL',
      source: 'asaas',
      maxNoInterestInstallments,
      options,
    });
  } catch (error) {
    console.error('[checkout][installments]', error);

    const fallback = buildFallbackInstallments(total);
    res.json({
      currency: 'BRL',
      source: 'fallback',
      maxNoInterestInstallments: fallback[fallback.length - 1].installments,
      options: fallback,
    });
  }
}

export async function getShippingRates(req: Request, res: Response): Promise<void> {
  const cep = String(req.query.cep || '').replace(/\D/g, '');
  const quantity = Math.max(1, Number(req.query.quantity) || 1);

  if (cep.length !== 8) {
    res.status(400).json({ message: 'CEP inválido.' });
    return;
  }

  try {
    const rates = await calculateShippingRates(cep, quantity);
    res.json(rates);
  } catch (error) {
    console.error('[checkout][shipping-rates]', error);
    res.status(503).json({ message: 'Não foi possível calcular o frete. Tente novamente.' });
  }
}

export async function validateCouponEndpoint(req: Request, res: Response): Promise<void> {
  const { code, subtotal, email, cpf } = req.body as {
    code?: string;
    subtotal?: unknown;
    email?: string;
    cpf?: string;
  };
  const sub = Number(subtotal);
  if (!code?.trim() || !Number.isFinite(sub) || sub <= 0) {
    res.status(400).json({ valid: false, message: 'code e subtotal são obrigatórios.' });
    return;
  }
  const result = await validateCoupon(code, sub, { email, cpf });
  res.json(result);
}

export async function createCheckout(req: Request, res: Response): Promise<void> {
  const authUserId = (req as AuthRequest).userId ?? null;
  const {
    name,
    email,
    cpf,
    items,
    paymentMethod = 'PIX',
    cardHolderName,
    cardNumber,
    cardExpiry,
    cardCvv,
    phone,
    postalCode,
    addressNumber,
    installments = 1,
    couponCode,
    shippingMethod,
    shippingLabel,
    shippingCost: shippingCostRaw,
    addressStreet,
    addressComplement,
    addressNeighborhood,
    addressCity,
    addressState,
    addressZip,
  } = req.body as CheckoutBody;

  const shippingCostVal = Math.max(0, Number(shippingCostRaw) || 0);
  const shippingData = {
    shippingMethod: shippingMethod?.trim() || null,
    shippingLabel: shippingLabel?.trim() || null,
    shippingCost: shippingCostVal > 0 ? shippingCostVal : null,
  };

  const addressData = {
    addressStreet: addressStreet?.trim() || null,
    addressNumber: addressNumber?.trim() || null,
    addressComplement: addressComplement?.trim() || null,
    addressNeighborhood: addressNeighborhood?.trim() || null,
    addressCity: addressCity?.trim() || null,
    addressState: addressState?.trim() || null,
    addressZip: addressZip?.replace(/\D/g, '') || null,
  };

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

  if (!['PIX', 'CREDIT_CARD', 'BOLETO'].includes(paymentMethod)) {
    res.status(400).json({ message: 'Método de pagamento inválido.' });
    return;
  }

  for (const item of items) {
    if (!item.variantId || item.quantity < 1 || item.priceAtPurchase <= 0) {
      res.status(400).json({ message: 'Item inválido na sacola.' });
      return;
    }
  }

  if (paymentMethod === 'CREDIT_CARD') {
    if (!cardHolderName?.trim() || !cardNumber?.trim() || !cardExpiry?.trim() || !cardCvv?.trim()) {
      res.status(400).json({ message: 'Dados do cartão de crédito incompletos.' });
      return;
    }
    if (!phone?.trim() || !postalCode?.trim() || !addressNumber?.trim()) {
      res.status(400).json({ message: 'Telefone, CEP e número do endereço são obrigatórios para cartão.' });
      return;
    }
  }

  try {
    let userId: string | null = null;
    if (authUserId) {
      const userExists = await prisma.user.findUnique({
        where: { id: authUserId },
        select: { id: true },
      });

      if (!userExists) {
        res.status(401).json({
          message: 'Sua sessão não é mais válida. Faça login novamente para concluir o pagamento.',
        });
        return;
      }

      userId = authUserId;
    }

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

    const subtotal = items.reduce((sum, i) => sum + i.priceAtPurchase * i.quantity, 0);

    // Apply coupon if provided
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;
    let appliedCouponId: string | null = null;
    if (couponCode?.trim()) {
      const couponResult = await validateCoupon(couponCode.trim(), subtotal, {
        email: email.trim(),
        cpf: cpfClean,
      });
      if (couponResult.valid && couponResult.couponId) {
        discountAmount = couponResult.discountAmount ?? 0;
        appliedCouponCode = couponResult.code ?? null;
        appliedCouponId = couponResult.couponId;
      } else if (!couponResult.valid) {
        res.status(400).json({ message: couponResult.message });
        return;
      }
    }
    const total = Math.max(0, Math.round((subtotal - discountAmount + shippingCostVal) * 100) / 100);

    const customer = await findOrCreateCustomer(name.trim(), email.trim(), cpfClean);

    // ── PIX ───────────────────────────────────────────────────────────────
    if (paymentMethod === 'PIX') {
      const payment = await createPixPayment(customer.id, total, 'Compra Vista Magic');
      const pix = await getPixQrCode(payment.id);

      const order = await prisma.order.create({
        data: {
          total,
          status: 'PENDING',
          paymentId: payment.id,
          paymentMethod: 'PIX',
          guestName: name.trim(),
          guestEmail: email.trim(),
          guestCpf: cpfClean,
          pixQrCode: pix.encodedImage,
          pixCopyPaste: pix.payload,
          pixExpiresAt: pix.expirationDate ? new Date(pix.expirationDate) : null,
          couponCode: appliedCouponCode,
          discountAmount: discountAmount > 0 ? discountAmount : null,
          ...(userId ? { userId } : {}),
          ...addressData,
          ...shippingData,
          items: {
            create: items.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
              priceAtPurchase: i.priceAtPurchase,
            })),
          },
        },
      });

      if (appliedCouponId) {
        await prisma.coupon.update({ where: { id: appliedCouponId }, data: { usedCount: { increment: 1 } } });
      }

      if (shippingMethod === 'RETIRADA') {
        sendPickupContactEmail({ customerName: name.trim(), customerEmail: email.trim(), orderId: order.id, total })
          .catch((err) => console.error('[checkout][pickup-email]', err.message));
      }

      res.json({
        orderId: order.id,
        paymentMethod: 'PIX',
        pixQrCode: pix.encodedImage,
        pixCopyPaste: pix.payload,
        pixExpiresAt: pix.expirationDate ?? null,
        total,
      });
      return;
    }

    // ── BOLETO ────────────────────────────────────────────────────────────
    if (paymentMethod === 'BOLETO') {
      const payment = await createBoletoPayment(customer.id, total, 'Compra Vista Magic');
      const boleto = await getBoletoData(payment.id);

      const order = await prisma.order.create({
        data: {
          total,
          status: 'PENDING',
          paymentId: payment.id,
          paymentMethod: 'BOLETO',
          guestName: name.trim(),
          guestEmail: email.trim(),
          guestCpf: cpfClean,
          boletoUrl: boleto.bankSlipUrl,
          boletoBarcode: boleto.nossoNumero,
          boletoDueDate: boleto.dueDate ? new Date(boleto.dueDate) : null,
          couponCode: appliedCouponCode,
          discountAmount: discountAmount > 0 ? discountAmount : null,
          ...(userId ? { userId } : {}),
          ...addressData,
          ...shippingData,
          items: {
            create: items.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
              priceAtPurchase: i.priceAtPurchase,
            })),
          },
        },
      });

      if (appliedCouponId) {
        await prisma.coupon.update({ where: { id: appliedCouponId }, data: { usedCount: { increment: 1 } } });
      }

      if (shippingMethod === 'RETIRADA') {
        sendPickupContactEmail({ customerName: name.trim(), customerEmail: email.trim(), orderId: order.id, total })
          .catch((err) => console.error('[checkout][pickup-email]', err.message));
      }

      res.json({
        orderId: order.id,
        paymentMethod: 'BOLETO',
        boletoUrl: boleto.bankSlipUrl,
        boletoBarcode: boleto.nossoNumero,
        boletoDueDate: boleto.dueDate,
        total,
      });
      return;
    }

    // ── CREDIT CARD ───────────────────────────────────────────────────────
    const [expiryMonth, expiryYear] = (cardExpiry ?? '').split('/').map((s) => s.trim());

    const cardData: CreditCardData = {
      holderName: cardHolderName!.trim(),
      number: (cardNumber ?? '').replace(/\s/g, ''),
      expiryMonth: expiryMonth ?? '',
      expiryYear: expiryYear?.length === 2 ? `20${expiryYear}` : (expiryYear ?? ''),
      ccv: cardCvv!.trim(),
    };

    const holderInfo: CreditCardHolderInfo = {
      name: name.trim(),
      email: email.trim(),
      cpfCnpj: cpfClean,
      postalCode: (postalCode ?? '').replace(/\D/g, ''),
      addressNumber: addressNumber!.trim(),
      phone: (phone ?? '').replace(/\D/g, ''),
    };

    const safeInstallments = Math.max(1, Math.min(12, Number(installments) || 1));
    const payment = await createCreditCardPayment(
      customer.id,
      total,
      'Compra Vista Magic',
      cardData,
      holderInfo,
      safeInstallments,
    );

    const order = await prisma.order.create({
      data: {
        total,
        status: payment.status === 'CONFIRMED' || payment.status === 'RECEIVED' ? 'PAID' : 'PENDING',
        paymentId: payment.id,
        paymentMethod: 'CREDIT_CARD',
        guestName: name.trim(),
        guestEmail: email.trim(),
        guestCpf: cpfClean,
        couponCode: appliedCouponCode,
        discountAmount: discountAmount > 0 ? discountAmount : null,
        ...(userId ? { userId } : {}),
        ...addressData,
        ...shippingData,
        items: {
          create: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
            priceAtPurchase: i.priceAtPurchase,
          })),
        },
      },
    });

    if (appliedCouponId) {
      await prisma.coupon.update({ where: { id: appliedCouponId }, data: { usedCount: { increment: 1 } } });
    }

    if (shippingMethod === 'RETIRADA') {
      sendPickupContactEmail({ customerName: name.trim(), customerEmail: email.trim(), orderId: order.id, total })
        .catch((err) => console.error('[checkout][pickup-email]', err.message));
    }

    res.json({
      orderId: order.id,
      paymentMethod: 'CREDIT_CARD',
      cardStatus: payment.status,
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
          message: 'Pagamento indisponível no momento. Tente novamente em instantes.',
        });
        return;
      }

      if (status === 429) {
        res.status(503).json({
          message: 'Serviço temporariamente sobrecarregado. Tente novamente em alguns minutos.',
        });
        return;
      }

      // Asaas returns validation errors as 400 with a body containing errors array
      const asaasErrors = error.response?.data?.errors;
      if (Array.isArray(asaasErrors) && asaasErrors.length > 0) {
        const msg = asaasErrors.map((e: { description?: string }) => e.description).filter(Boolean).join('. ');
        if (msg) {
          res.status(400).json({ message: msg });
          return;
        }
      }
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[checkout][prisma]', {
        code: error.code,
        meta: error.meta,
        message: error.message,
      });

      if (error.code === 'P2003') {
        res.status(409).json({
          message: 'Não foi possível confirmar o pedido com os dados atuais. Atualize a página e tente novamente.',
        });
        return;
      }

      if (error.code === 'P2025') {
        res.status(409).json({
          message: 'Um recurso usado no checkout não está mais disponível. Revise a sacola e tente novamente.',
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
    PAYMENT_UPDATED: 'PENDING',
    PAYMENT_OVERDUE: 'OVERDUE',
    PAYMENT_DELETED: 'CANCELLED',
    PAYMENT_REFUNDED: 'REFUNDED',
    PAYMENT_AUTHORIZED: 'PAID',
    PAYMENT_DECLINED: 'CANCELLED',
  };

  const paymentStatusMap: Record<string, string> = {
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

  const eventMappedStatus = statusMap[event];
  const paymentMappedStatus = paymentStatusMap[String(payment.status || '').toUpperCase()];

  // Prefer the canonical payment.status when available; fallback to event map.
  const newStatus = paymentMappedStatus || eventMappedStatus;
  if (!newStatus) {
    console.log('[webhook] event ignored', {
      event,
      paymentId: payment.id,
      paymentStatus: payment.status,
    });
    res.sendStatus(200);
    return;
  }

  try {
    const updateStockOnPaid = shouldUpdateStockOnPaidWebhook();

    const orders = await prisma.order.findMany({
      where: { paymentId: payment.id },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
      },
    });

    for (const order of orders) {
      const statusChanged = order.status !== newStatus;
      if (statusChanged) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: newStatus },
        });

        await prisma.orderStatusUpdate.create({
          data: { orderId: order.id, status: newStatus },
        });
      }

      // Idempotency: only execute post-payment effects once when status transitions to PAID.
      if (newStatus === 'PAID' && order.status !== 'PAID') {
        if (updateStockOnPaid) {
          for (const item of order.items) {
            await prisma.variant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        } else {
          console.log('[webhook][stock] skipping stock decrement (sandbox mode)', {
            orderId: order.id,
            paymentId: payment.id,
          });
        }

        // Send notifications (non-blocking)
        const emailItems = order.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
          productName: item.variant.product.name,
          color: item.variant.color,
          size: item.variant.size,
        }));

        const emailData = {
          orderId: order.id,
          customerName: order.guestName || 'Cliente',
          customerEmail: order.guestEmail || '',
          customerCpf: order.guestCpf || '',
          paymentMethod: order.paymentMethod || 'PIX',
          total: Number(order.total),
          items: emailItems.map((item) => ({
            ...item,
            priceAtPurchase: Number(item.priceAtPurchase),
          })),
          address: {
            street: order.addressStreet || undefined,
            number: order.addressNumber || undefined,
            complement: order.addressComplement || undefined,
            neighborhood: order.addressNeighborhood || undefined,
            city: order.addressCity || undefined,
            state: order.addressState || undefined,
            zip: order.addressZip || undefined,
          },
        };

        sendStoreNotification(emailData).catch((err) =>
          console.error('[webhook][email-store]', err.message)
        );

        if (order.guestEmail) {
          sendCustomerConfirmation(emailData).catch((err) =>
            console.error('[webhook][email-customer]', err.message)
          );
        }

        notifyStoreWhatsApp({
          orderId: order.id,
          customerName: order.guestName || 'Cliente',
          paymentMethod: order.paymentMethod || 'PIX',
          total: Number(order.total),
          itemCount: order.items.length,
        }).catch((err) => console.error('[webhook][whatsapp]', err.message));
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('[webhook]', error);
    res.sendStatus(500);
  }
}
