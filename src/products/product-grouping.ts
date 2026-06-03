function normalizeProductName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\bm\.?\s+(?=(longa|curta|3\/4)\b)/g, 'manga ')
    .replace(/\s+/g, ' ');
}

export function normalizeGroupKey(value: string): string {
  return normalizeProductName(value);
}

export function buildProductGroupKey(product: { name: string; category: string }): string {
  return `${normalizeProductName(product.name)}::${normalizeProductName(product.category)}`;
}
