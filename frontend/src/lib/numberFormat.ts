function toNumber(value: number | string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrencyBRL(value: number | string): string {
  return currencyFormatter.format(toNumber(value));
}

export function formatIntegerBR(value: number | string): string {
  return integerFormatter.format(toNumber(value));
}

export function formatNumberBR(
  value: number | string,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const minimumFractionDigits = options?.minimumFractionDigits ?? 0;
  const maximumFractionDigits = options?.maximumFractionDigits ?? 2;

  return toNumber(value).toLocaleString('pt-BR', {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

export function formatPercentBR(
  value: number | string,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  return `${formatNumberBR(value, options)}%`;
}
