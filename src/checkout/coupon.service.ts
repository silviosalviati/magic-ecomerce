import { prisma } from '../config/database';

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  couponId?: string;
  code?: string;
  type?: string;
  discountAmount?: number;
  finalTotal?: number;
}

interface CouponValidationIdentity {
  email?: string | null;
  cpf?: string | null;
}

function normalizeEmail(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCpf(value?: string | null): string | null {
  if (!value) return null;
  const normalized = String(value).replace(/\D/g, '');
  return normalized.length === 11 ? normalized : null;
}

export async function validateCoupon(
  code: string,
  subtotal: number,
  identity?: CouponValidationIdentity,
): Promise<CouponValidationResult> {
  const normalizedCode = code.toUpperCase().trim();
  const coupon = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
  const normalizedEmail = normalizeEmail(identity?.email);
  const normalizedCpf = normalizeCpf(identity?.cpf);

  if (!coupon) return { valid: false, message: 'Cupom não encontrado.' };
  if (!coupon.active) return { valid: false, message: 'Cupom inativo.' };
  if (new Date() > coupon.expiresAt) return { valid: false, message: 'Cupom expirado.' };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, message: 'Cupom esgotado.' };
  }

  if (normalizedEmail || normalizedCpf) {
    const alreadyUsedByIdentity = await prisma.order.findFirst({
      where: {
        couponCode: normalizedCode,
        OR: [
          ...(normalizedEmail
            ? [{ guestEmail: { equals: normalizedEmail, mode: 'insensitive' as const } }]
            : []),
          ...(normalizedCpf ? [{ guestCpf: normalizedCpf }] : []),
        ],
      },
      select: { id: true },
    });

    if (alreadyUsedByIdentity) {
      return {
        valid: false,
        message: 'Este cupom já foi utilizado para este e-mail ou CPF.',
      };
    }
  }

  const discountValue = Number(coupon.discount);
  let discountAmount: number;
  if (coupon.type === 'PERCENTAGE') {
    discountAmount = Math.round(subtotal * discountValue) / 100;
  } else {
    discountAmount = Math.min(discountValue, subtotal);
  }
  discountAmount = Math.round(discountAmount * 100) / 100;

  const finalTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  const label =
    coupon.type === 'PERCENTAGE'
      ? `${discountValue}% de desconto`
      : `R$ ${discountAmount.toFixed(2).replace('.', ',')} de desconto`;

  return {
    valid: true,
    message: `${label} aplicado!`,
    couponId: coupon.id,
    code: normalizedCode,
    type: coupon.type,
    discountAmount,
    finalTotal,
  };
}
