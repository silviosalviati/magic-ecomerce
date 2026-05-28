export interface ApiVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  barcode?: string | null;
  stock: number;
}

export interface ApiProduct {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  basePrice: string | number;
  costPrice: string | number;
  markup: string | number;
  images: string[];
  createdAt: string;
  variants: ApiVariant[];
}

export interface CatalogVariant {
  variantId: string;
  productId: string;
  color: string;
  size: string;
  barcode: string;
  stock: number;
}

export interface CatalogProduct {
  productId: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  images: string[];
  price: number;
  variants: CatalogVariant[];
}

export interface CartItem {
  cartKey: string;
  variantId: string;
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  color: string;
  size: string;
  barcode: string;
  stock: number;
  quantity: number;
}

export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO';

export interface CreditCardFormData {
  cardHolderName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  phone: string;
  postalCode: string;
  addressNumber: string;
  installments: number;
}

export interface CouponValidationResponse {
  valid: boolean;
  message: string;
  type?: string;
  discountAmount?: number;
  finalTotal?: number;
}

export interface CheckoutPayload {
  name: string;
  email: string;
  cpf: string;
  items: { variantId: string; quantity: number; priceAtPurchase: number }[];
  paymentMethod: PaymentMethod;
  couponCode?: string;
  // Credit card fields
  cardHolderName?: string;
  cardNumber?: string;
  cardExpiry?: string;
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

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt?: string | null;
}

export interface AuthRegisterResponse {
  message: string;
  requiresVerification: boolean;
}

export interface AuthLoginResponse {
  token: string;
  user: AuthUser;
}

export interface AuthMessageResponse {
  message: string;
}

export interface OrderItem {
  id: string;
  quantity: number;
  priceAtPurchase: number;
  productName: string;
  color: string;
  size: string;
  productId: string;
}

export interface OrderStatusUpdate {
  status: string;
  note: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  status: string;
  paymentMethod: string | null;
  total: number;
  createdAt: string;
  shippingMethod: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  items: OrderItem[];
  statusHistory?: OrderStatusUpdate[];
  address?: {
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
}

export interface CheckoutResponse {
  orderId: string;
  total: number;
  paymentMethod: PaymentMethod;
  // PIX
  pixQrCode?: string;
  pixCopyPaste?: string;
  pixExpiresAt?: string | null;
  // Credit card
  cardStatus?: string;
  // Boleto
  boletoUrl?: string;
  boletoBarcode?: string;
  boletoDueDate?: string;
}

export interface InstallmentOption {
  installments: number;
  installmentValue: number;
  total: number;
  hasInterest: boolean;
  interestAmount: number;
}

export interface CheckoutInstallmentsResponse {
  currency: 'BRL';
  source: 'asaas' | 'fallback';
  maxNoInterestInstallments: number;
  options: InstallmentOption[];
}
