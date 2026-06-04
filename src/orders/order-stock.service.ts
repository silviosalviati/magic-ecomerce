import { Prisma } from '@prisma/client';

const RESTOCK_STATUSES = new Set(['REFUNDED', 'CANCELLED']);

export interface OrderStockItem {
  variantId: string;
  quantity: number;
}

export interface SyncOrderStockInput {
  previousStatus: string;
  nextStatus: string;
  orderId: string;
  items: OrderStockItem[];
}

function shouldDeductStock(previousStatus: string, nextStatus: string): boolean {
  return previousStatus !== 'PAID' && nextStatus === 'PAID';
}

function shouldRestock(previousStatus: string, nextStatus: string): boolean {
  return previousStatus === 'PAID' && RESTOCK_STATUSES.has(nextStatus);
}

export async function syncOrderStockForStatusTransition(
  tx: Prisma.TransactionClient,
  input: SyncOrderStockInput,
): Promise<'decremented' | 'restocked' | 'unchanged'> {
  const previousStatus = String(input.previousStatus || '').toUpperCase();
  const nextStatus = String(input.nextStatus || '').toUpperCase();

  if (shouldDeductStock(previousStatus, nextStatus)) {
    for (const item of input.items) {
      const updated = await tx.variant.updateMany({
        where: {
          id: item.variantId,
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      if (updated.count !== 1) {
        throw new Error(`Estoque insuficiente para baixar a variante ${item.variantId} do pedido ${input.orderId}.`);
      }
    }

    return 'decremented';
  }

  if (shouldRestock(previousStatus, nextStatus)) {
    for (const item of input.items) {
      await tx.variant.update({
        where: { id: item.variantId },
        data: {
          stock: { increment: item.quantity },
        },
      });
    }

    return 'restocked';
  }

  return 'unchanged';
}