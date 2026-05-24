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

export interface CheckoutPayload {
  name: string;
  email: string;
  cpf: string;
  items: { variantId: string; quantity: number; priceAtPurchase: number }[];
  paymentMethod: PaymentMethod;
  // Credit card fields
  cardHolderName?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  phone?: string;
  postalCode?: string;
  addressNumber?: string;
  installments?: number;
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
