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
