import { Request, Response, NextFunction } from 'express';

// ─── Helpers de validação ────────────────────────────────────────────────────

function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

function isPositiveNumber(val: unknown): boolean {
  const n = Number(val);
  return !isNaN(n) && n > 0;
}

function isNonNegativeInt(val: unknown): boolean {
  const n = Number(val);
  return !isNaN(n) && Number.isInteger(n) && n >= 0;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export function validateCreateProduct(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { name, category, costPrice, markup, size, color, barcode, stock } =
    req.body;

  const errors: string[] = [];

  if (!isNonEmptyString(name)) errors.push('name é obrigatório.');
  if (!isNonEmptyString(category)) errors.push('category é obrigatório.');
  if (!isPositiveNumber(costPrice)) errors.push('costPrice deve ser número positivo.');
  if (!isPositiveNumber(markup)) errors.push('markup deve ser número positivo.');
  if (!isNonEmptyString(size)) errors.push('size é obrigatório.');
  if (!isNonEmptyString(color)) errors.push('color é obrigatório.');
  if (!isNonEmptyString(barcode)) errors.push('barcode é obrigatório.');
  if (!isNonNegativeInt(stock)) errors.push('stock deve ser inteiro não-negativo.');

  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  next();
}

export function validateUpdateStock(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { stock } = req.body;

  if (!isNonNegativeInt(stock)) {
    res.status(400).json({ errors: ['stock deve ser inteiro não-negativo.'] });
    return;
  }

  next();
}