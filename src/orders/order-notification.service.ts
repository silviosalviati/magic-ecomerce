import { prisma } from '../config/database';
import {
  sendCustomerConfirmation,
  sendCustomerOrderStatusUpdate,
  sendStoreNotification,
} from '../config/mailer';
import { notifyStoreWhatsApp } from '../config/whatsapp';

async function loadOrderNotificationContext(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      total: true,
      paymentMethod: true,
      status: true,
      guestName: true,
      guestEmail: true,
      guestCpf: true,
      shippingMethod: true,
      trackingCode: true,
      trackingUrl: true,
      addressStreet: true,
      addressNumber: true,
      addressComplement: true,
      addressNeighborhood: true,
      addressCity: true,
      addressState: true,
      addressZip: true,
      items: {
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });
}

function toOrderEmailData(order: NonNullable<Awaited<ReturnType<typeof loadOrderNotificationContext>>>) {
  return {
    orderId: order.id,
    customerName: order.guestName || 'Cliente',
    customerEmail: order.guestEmail || '',
    customerCpf: order.guestCpf || '',
    paymentMethod: order.paymentMethod || 'PIX',
    total: Number(order.total),
    address: order.addressStreet
      ? {
          street: order.addressStreet,
          number: order.addressNumber || '',
          complement: order.addressComplement || '',
          neighborhood: order.addressNeighborhood || '',
          city: order.addressCity || '',
          state: order.addressState || '',
          zip: order.addressZip || '',
        }
      : undefined,
    items: order.items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      priceAtPurchase: Number(item.priceAtPurchase),
      productName: item.variant.product.name,
      color: item.variant.color,
      size: item.variant.size,
    })),
  };
}

export async function sendPaidOrderNotifications(orderId: string): Promise<void> {
  const order = await loadOrderNotificationContext(orderId);
  if (!order) return;

  const emailData = toOrderEmailData(order);

  sendStoreNotification(emailData).catch((err) =>
    console.error('[order-notify][email-store]', err.message)
  );

  if (order.guestEmail) {
    sendCustomerConfirmation(emailData).catch((err) =>
      console.error('[order-notify][email-customer-paid]', err.message)
    );
  }

  notifyStoreWhatsApp({
    orderId: order.id,
    customerName: order.guestName || 'Cliente',
    paymentMethod: order.paymentMethod || 'PIX',
    total: Number(order.total),
    itemCount: order.items.length,
  }).catch((err) => console.error('[order-notify][whatsapp]', err.message));
}

export async function sendCustomerStatusEmail(orderId: string, statusOverride?: string): Promise<void> {
  const order = await loadOrderNotificationContext(orderId);
  if (!order?.guestEmail) return;

  const status = String(statusOverride || order.status || '').toUpperCase();
  if (!status || status === 'PENDING' || status === 'PAID') return;

  const emailData = toOrderEmailData(order);

  sendCustomerOrderStatusUpdate({
    ...emailData,
    status,
    shippingMethod: order.shippingMethod,
    trackingCode: order.trackingCode,
    trackingUrl: order.trackingUrl,
  }).catch((err) =>
    console.error('[order-notify][email-customer-status]', err.message)
  );
}