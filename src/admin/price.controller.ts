import { Request, Response } from 'express';
import { prisma } from '../config/database';

function clientError(error: unknown): string {
  if (process.env.NODE_ENV === 'production') return 'Erro interno.';
  return error instanceof Error ? error.message : String(error);
}

export async function updateProductPrice(req: Request, res: Response) {
  const id = String(req.params.id);
  const { costPrice, markup, basePrice, reason } = req.body;
  const changedBy = (req as any).user?.id ?? 'admin';

  const costPriceNum = Number(costPrice);
  if (!Number.isFinite(costPriceNum) || costPriceNum <= 0) {
    res.status(400).json({ error: 'Custo inválido.' });
    return;
  }

  let markupNum: number;
  let basePriceNum: number;

  if (basePrice !== undefined) {
    basePriceNum = Number(basePrice);
    if (!Number.isFinite(basePriceNum) || basePriceNum <= 0) {
      res.status(400).json({ error: 'Preço de venda inválido.' });
      return;
    }
    markupNum = Number((basePriceNum / costPriceNum).toFixed(6));
  } else {
    markupNum = Number(markup);
    if (!Number.isFinite(markupNum) || markupNum <= 0) {
      res.status(400).json({ error: 'Markup inválido.' });
      return;
    }
    basePriceNum = Number((costPriceNum * markupNum).toFixed(2));
  }

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ error: 'Produto não encontrado.' });
      return;
    }

    const [updated] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { costPrice: costPriceNum, markup: markupNum, basePrice: basePriceNum },
      }),
      prisma.priceHistory.create({
        data: {
          productId: id,
          oldCostPrice: product.costPrice,
          oldMarkup: product.markup,
          oldBasePrice: product.basePrice,
          newCostPrice: costPriceNum,
          newMarkup: markupNum,
          newBasePrice: basePriceNum,
          changedBy,
          reason: reason ?? null,
        },
      }),
    ]);

    res.json({ product: updated });
  } catch (err) {
    res.status(500).json({ error: clientError(err) });
  }
}

export async function bulkUpdatePrice(req: Request, res: Response) {
  const { filter, change } = req.body;
  const changedBy = (req as any).user?.id ?? 'admin';

  if (!filter || !change) {
    res.status(400).json({ error: 'filter e change são obrigatórios.' });
    return;
  }

  const { category, productIds } = filter as { category?: string; productIds?: string[] };
  const { markup, markupDelta, reason } = change as { markup?: number; markupDelta?: number; reason?: string };

  if (markup === undefined && markupDelta === undefined) {
    res.status(400).json({ error: 'Informe markup ou markupDelta no change.' });
    return;
  }

  const where: Record<string, unknown> = {};
  if (productIds?.length) {
    where.id = { in: productIds };
  } else if (category) {
    where.category = { equals: category, mode: 'insensitive' };
  } else {
    res.status(400).json({ error: 'Informe category ou productIds no filter.' });
    return;
  }

  try {
    const products = await prisma.product.findMany({ where });

    if (products.length === 0) {
      res.json({ updated: 0 });
      return;
    }

    await prisma.$transaction(
      products.flatMap((p) => {
        const newMarkup =
          markupDelta !== undefined
            ? Number((Number(p.markup) + markupDelta).toFixed(6))
            : Number(markup!);
        const newBasePrice = Number((Number(p.costPrice) * newMarkup).toFixed(2));

        return [
          prisma.product.update({
            where: { id: p.id },
            data: { markup: newMarkup, basePrice: newBasePrice },
          }),
          prisma.priceHistory.create({
            data: {
              productId: p.id,
              oldCostPrice: p.costPrice,
              oldMarkup: p.markup,
              oldBasePrice: p.basePrice,
              newCostPrice: p.costPrice,
              newMarkup,
              newBasePrice,
              changedBy,
              reason: reason ?? null,
            },
          }),
        ];
      })
    );

    res.json({ updated: products.length });
  } catch (err) {
    res.status(500).json({ error: clientError(err) });
  }
}

export async function getPriceHistory(req: Request, res: Response) {
  const id = String(req.params.id);
  try {
    const history = await prisma.priceHistory.findMany({
      where: { productId: id },
      orderBy: { changedAt: 'desc' },
    });
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: clientError(err) });
  }
}